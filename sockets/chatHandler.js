const { v4: uuidv4 } = require('uuid');
const { ChatSession, ChatMessage, User } = require('../models');

/**
 * Handler de Socket.io para chat en vivo
 * @param {Server} io - Instancia de Socket.io
 */
module.exports = (io) => {
  // Almacén temporal de conexiones activas (mapeo sessionId -> socketId)
  const visitorSockets = new Map();
  const agentSockets = new Map();

  io.on('connection', (socket) => {
    console.log(`🔌 Nueva conexión: ${socket.id}`);

    // ===========================================
    // EVENTOS DEL VISITANTE
    // ===========================================

    // Iniciar nueva sesión de chat
    socket.on('chat:start', async (data) => {
      try {
        const visitorId = data.visitorId || uuidv4();

        // Crear sesión en la base de datos
        const session = await ChatSession.create({
          visitor_id: visitorId,
          visitor_name: data.name || 'Visitante',
          visitor_email: data.email || null,
          status: 'waiting'
        });

        // Guardar mensaje de bienvenida automático
        const welcomeMessage = await ChatMessage.create({
          session_id: session.id,
          sender_type: 'bot',
          message: '¡Hola! Bienvenido a nuestro chat. Un agente estará contigo en breve.'
        });

        // Almacenar relación socket-sesión
        visitorSockets.set(session.id, socket.id);
        socket.visitorSessionId = session.id;

        // Unir al room de la sesión
        socket.join(`chat:${session.id}`);

        // Notificar al visitante
        socket.emit('chat:started', {
          sessionId: session.id,
          visitorId,
          messages: [{
            id: welcomeMessage.id,
            senderType: 'bot',
            content: welcomeMessage.message,
            timestamp: welcomeMessage.created_at
          }]
        });

        // Notificar a los agentes
        io.to('agents').emit('chat:new_session', {
          sessionId: session.id,
          visitorName: session.visitor_name,
          visitorEmail: session.visitor_email,
          createdAt: session.created_at
        });

        console.log(`💬 Nueva sesión de chat: ${session.id}`);
      } catch (error) {
        console.error('Error creando sesión:', error);
        socket.emit('chat:error', { message: 'Error al iniciar el chat' });
      }
    });

    // Reconectar a sesión existente
    socket.on('chat:reconnect', async (data) => {
      try {
        const session = await ChatSession.findByPk(data.sessionId, {
          include: [{
            model: ChatMessage,
            as: 'messages',
            order: [['created_at', 'ASC']]
          }]
        });

        if (!session || session.status === 'closed') {
          socket.emit('chat:error', { message: 'Sesión no encontrada o cerrada' });
          return;
        }

        // Actualizar mapeo
        visitorSockets.set(session.id, socket.id);
        socket.visitorSessionId = session.id;
        socket.join(`chat:${session.id}`);

        // Enviar historial
        socket.emit('chat:reconnected', {
          sessionId: session.id,
          status: session.status,
          messages: session.messages.map(m => ({
            id: m.id,
            senderType: m.sender_type,
            content: m.message,
            timestamp: m.created_at
          }))
        });

        console.log(`🔄 Reconexión a sesión: ${session.id}`);
      } catch (error) {
        console.error('Error reconectando:', error);
        socket.emit('chat:error', { message: 'Error al reconectar' });
      }
    });

    // Mensaje del visitante
    socket.on('chat:visitor_message', async (data) => {
      try {
        const session = await ChatSession.findByPk(data.sessionId);

        if (!session || session.status === 'closed') {
          socket.emit('chat:error', { message: 'Sesión no disponible' });
          return;
        }

        // Guardar mensaje en BD
        const message = await ChatMessage.create({
          session_id: session.id,
          sender_type: 'visitor',
          message: data.message
        });

        // Enviar a todos en la sala (visitante + agente)
        io.to(`chat:${data.sessionId}`).emit('chat:message', {
          id: message.id,
          senderType: 'visitor',
          content: message.message,
          timestamp: message.created_at
        });
      } catch (error) {
        console.error('Error enviando mensaje:', error);
        socket.emit('chat:error', { message: 'Error al enviar mensaje' });
      }
    });

    // ===========================================
    // EVENTOS DEL AGENTE
    // ===========================================

    // Agente se conecta
    socket.on('agent:join', async (data) => {
      try {
        socket.join('agents');
        socket.agentId = data.agentId;
        agentSockets.set(data.agentId, socket.id);

        // Obtener sesiones activas de BD
        const sessions = await ChatSession.findAll({
          where: {
            status: ['waiting', 'active']
          },
          include: [{
            model: ChatMessage,
            as: 'messages',
            limit: 1,
            order: [['created_at', 'DESC']]
          }, {
            model: User,
            as: 'agent',
            attributes: ['id', 'first_name', 'last_name']
          }],
          order: [['created_at', 'DESC']]
        });

        // Enviar lista de sesiones al agente
        socket.emit('agent:sessions_list', sessions.map(s => ({
          sessionId: s.id,
          visitorName: s.visitor_name,
          visitorEmail: s.visitor_email,
          status: s.status,
          assignedTo: s.agent ? `${s.agent.first_name} ${s.agent.last_name}` : null,
          createdAt: s.created_at,
          lastMessage: s.messages[0]?.message || null
        })));

        console.log(`👤 Agente conectado: ${data.agentId}`);
      } catch (error) {
        console.error('Error conectando agente:', error);
      }
    });

    // Agente toma una sesión
    socket.on('agent:take_session', async (data) => {
      try {
        const session = await ChatSession.findByPk(data.sessionId, {
          include: [{
            model: ChatMessage,
            as: 'messages',
            order: [['created_at', 'ASC']]
          }]
        });

        if (!session) {
          socket.emit('chat:error', { message: 'Sesión no encontrada' });
          return;
        }

        // Actualizar sesión en BD
        await session.update({
          status: 'active',
          assigned_to: data.agentId
        });

        // Unir agente al room
        socket.join(`chat:${data.sessionId}`);

        // Mensaje de sistema
        const systemMessage = await ChatMessage.create({
          session_id: session.id,
          sender_type: 'bot',
          message: `${data.agentName || 'Un agente'} se ha unido al chat.`
        });

        // Notificar al visitante
        io.to(`chat:${data.sessionId}`).emit('chat:agent_joined', {
          agentName: data.agentName || 'Agente',
          message: {
            id: systemMessage.id,
            senderType: 'bot',
            content: systemMessage.message,
            timestamp: systemMessage.created_at
          }
        });

        // Enviar historial al agente
        socket.emit('agent:session_history', {
          sessionId: session.id,
          visitorName: session.visitor_name,
          visitorEmail: session.visitor_email,
          messages: session.messages.map(m => ({
            id: m.id,
            senderType: m.sender_type,
            content: m.message,
            timestamp: m.created_at
          }))
        });

        // Notificar a otros agentes
        socket.to('agents').emit('agent:session_taken', {
          sessionId: data.sessionId,
          agentId: data.agentId,
          agentName: data.agentName
        });

        console.log(`✅ Agente ${data.agentId} tomó sesión ${data.sessionId}`);
      } catch (error) {
        console.error('Error tomando sesión:', error);
        socket.emit('chat:error', { message: 'Error al tomar la sesión' });
      }
    });

    // Mensaje del agente
    socket.on('agent:message', async (data) => {
      try {
        const session = await ChatSession.findByPk(data.sessionId);

        if (!session) {
          socket.emit('chat:error', { message: 'Sesión no encontrada' });
          return;
        }

        // Guardar mensaje en BD
        const message = await ChatMessage.create({
          session_id: session.id,
          sender_type: 'agent',
          message: data.message
        });

        // Enviar a todos en la sala
        io.to(`chat:${data.sessionId}`).emit('chat:message', {
          id: message.id,
          senderType: 'agent',
          content: message.message,
          timestamp: message.created_at
        });
      } catch (error) {
        console.error('Error enviando mensaje agente:', error);
        socket.emit('chat:error', { message: 'Error al enviar mensaje' });
      }
    });

    // Agente cierra sesión de chat
    socket.on('agent:close_session', async (data) => {
      try {
        const session = await ChatSession.findByPk(data.sessionId);

        if (!session) {
          socket.emit('chat:error', { message: 'Sesión no encontrada' });
          return;
        }

        // Mensaje de despedida
        const closingMessage = await ChatMessage.create({
          session_id: session.id,
          sender_type: 'bot',
          message: 'El chat ha sido cerrado. ¡Gracias por contactarnos!'
        });

        // Actualizar sesión en BD
        await session.update({
          status: 'closed',
          closed_at: new Date()
        });

        // Notificar al visitante
        io.to(`chat:${data.sessionId}`).emit('chat:closed', {
          message: {
            id: closingMessage.id,
            senderType: 'bot',
            content: closingMessage.message,
            timestamp: closingMessage.created_at
          }
        });

        // Notificar a agentes
        io.to('agents').emit('agent:session_closed', {
          sessionId: data.sessionId
        });

        // Limpiar del mapa
        visitorSockets.delete(data.sessionId);

        console.log(`🔒 Sesión cerrada: ${data.sessionId}`);
      } catch (error) {
        console.error('Error cerrando sesión:', error);
        socket.emit('chat:error', { message: 'Error al cerrar la sesión' });
      }
    });

    // ===========================================
    // EVENTOS DE ESCRITURA
    // ===========================================

    socket.on('chat:typing', (data) => {
      socket.to(`chat:${data.sessionId}`).emit('chat:typing', {
        isTyping: data.isTyping,
        senderType: data.senderType
      });
    });

    // ===========================================
    // DESCONEXIÓN
    // ===========================================

    socket.on('disconnect', async () => {
      console.log(`🔌 Desconexión: ${socket.id}`);

      // Si era un visitante
      if (socket.visitorSessionId) {
        const sessionId = socket.visitorSessionId;
        visitorSockets.delete(sessionId);

        // Notificar al agente
        io.to(`chat:${sessionId}`).emit('chat:visitor_disconnected', {
          sessionId
        });
      }

      // Si era un agente
      if (socket.agentId) {
        agentSockets.delete(socket.agentId);
      }
    });
  });
};
