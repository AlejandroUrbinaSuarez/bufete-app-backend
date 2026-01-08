const { v4: uuidv4 } = require('uuid');

/**
 * Handler de Socket.io para chat en vivo
 * @param {Server} io - Instancia de Socket.io
 */
module.exports = (io) => {
  // Almacén temporal de sesiones activas (en producción usar Redis)
  const activeSessions = new Map();
  const agentSockets = new Map();

  io.on('connection', (socket) => {
    console.log(`🔌 Nueva conexión: ${socket.id}`);

    // ===========================================
    // EVENTOS DEL VISITANTE
    // ===========================================

    // Iniciar nueva sesión de chat
    socket.on('chat:start', (data) => {
      const sessionId = uuidv4();
      const session = {
        id: sessionId,
        visitorName: data.name || 'Visitante',
        visitorEmail: data.email || null,
        visitorSocketId: socket.id,
        status: 'waiting',
        messages: [],
        createdAt: new Date(),
        agentId: null
      };

      activeSessions.set(sessionId, session);
      socket.join(`chat:${sessionId}`);

      // Notificar al visitante
      socket.emit('chat:started', {
        sessionId,
        message: '¡Hola! Un agente estará contigo en breve.'
      });

      // Notificar a los agentes
      io.to('agents').emit('chat:new_session', {
        sessionId,
        visitorName: session.visitorName,
        createdAt: session.createdAt
      });

      console.log(`💬 Nueva sesión de chat: ${sessionId}`);
    });

    // Mensaje del visitante
    socket.on('chat:visitor_message', (data) => {
      const session = activeSessions.get(data.sessionId);

      if (!session) {
        socket.emit('chat:error', { message: 'Sesión no encontrada' });
        return;
      }

      const message = {
        id: uuidv4(),
        senderType: 'visitor',
        content: data.message,
        timestamp: new Date()
      };

      session.messages.push(message);

      // Enviar a todos en la sala (visitante + agente)
      io.to(`chat:${data.sessionId}`).emit('chat:message', message);
    });

    // ===========================================
    // EVENTOS DEL AGENTE
    // ===========================================

    // Agente se conecta
    socket.on('agent:join', (data) => {
      socket.join('agents');
      agentSockets.set(data.agentId, socket.id);

      // Enviar sesiones activas
      const waitingSessions = Array.from(activeSessions.values())
        .filter(s => s.status === 'waiting' || s.status === 'active')
        .map(s => ({
          sessionId: s.id,
          visitorName: s.visitorName,
          status: s.status,
          createdAt: s.createdAt,
          messageCount: s.messages.length
        }));

      socket.emit('agent:sessions_list', waitingSessions);
      console.log(`👤 Agente conectado: ${data.agentId}`);
    });

    // Agente toma una sesión
    socket.on('agent:take_session', (data) => {
      const session = activeSessions.get(data.sessionId);

      if (!session) {
        socket.emit('chat:error', { message: 'Sesión no encontrada' });
        return;
      }

      session.status = 'active';
      session.agentId = data.agentId;
      session.agentSocketId = socket.id;

      socket.join(`chat:${data.sessionId}`);

      // Notificar al visitante
      io.to(`chat:${data.sessionId}`).emit('chat:agent_joined', {
        agentName: data.agentName || 'Agente'
      });

      // Enviar historial al agente
      socket.emit('agent:session_history', {
        sessionId: data.sessionId,
        messages: session.messages,
        visitorName: session.visitorName,
        visitorEmail: session.visitorEmail
      });

      // Notificar a otros agentes que la sesión fue tomada
      socket.to('agents').emit('agent:session_taken', {
        sessionId: data.sessionId,
        agentId: data.agentId
      });
    });

    // Mensaje del agente
    socket.on('agent:message', (data) => {
      const session = activeSessions.get(data.sessionId);

      if (!session) {
        socket.emit('chat:error', { message: 'Sesión no encontrada' });
        return;
      }

      const message = {
        id: uuidv4(),
        senderType: 'agent',
        content: data.message,
        timestamp: new Date()
      };

      session.messages.push(message);

      // Enviar a todos en la sala
      io.to(`chat:${data.sessionId}`).emit('chat:message', message);
    });

    // Agente cierra sesión de chat
    socket.on('agent:close_session', (data) => {
      const session = activeSessions.get(data.sessionId);

      if (session) {
        session.status = 'closed';
        session.closedAt = new Date();

        // Notificar al visitante
        io.to(`chat:${data.sessionId}`).emit('chat:closed', {
          message: 'El chat ha sido cerrado. ¡Gracias por contactarnos!'
        });

        // TODO: Guardar sesión en base de datos

        // Limpiar después de un tiempo
        setTimeout(() => {
          activeSessions.delete(data.sessionId);
        }, 60000); // 1 minuto
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

    socket.on('disconnect', () => {
      console.log(`🔌 Desconexión: ${socket.id}`);

      // Buscar si era un visitante con sesión activa
      for (const [sessionId, session] of activeSessions.entries()) {
        if (session.visitorSocketId === socket.id) {
          session.status = 'visitor_disconnected';

          // Notificar al agente si hay uno asignado
          if (session.agentSocketId) {
            io.to(session.agentSocketId).emit('chat:visitor_disconnected', {
              sessionId
            });
          }
        }
      }

      // Limpiar de agentes si era un agente
      for (const [agentId, socketId] of agentSockets.entries()) {
        if (socketId === socket.id) {
          agentSockets.delete(agentId);
          break;
        }
      }
    });
  });
};
