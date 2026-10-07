import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Message, Match } from '../types';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import '../styles/chat.css';
import '../styles/skeleton.css';

export default function Chat() {
  const { matchId } = useParams<{ matchId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [matchInfo, setMatchInfo] = useState<Match | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const navigate = useNavigate();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Load initial data
  useEffect(() => {
    if (!matchId) return;

    const loadData = async () => {
      try {
        const [msgs, matches] = await Promise.all([
          api.getMessages(parseInt(matchId)),
          api.getMatches()
        ]);
        setMessages(msgs);
        const currentMatch = matches.find(m => m.matchId === parseInt(matchId));
        setMatchInfo(currentMatch || null);
      } catch (err) {
        console.error('Error loading chat:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [matchId]);

  // Mark read when entering chat
  useEffect(() => {
    if (socket && matchInfo && matchId) {
      socket.emit('mark_read', { 
        matchId: parseInt(matchId), 
        otherUserId: matchInfo.userId 
      });
    }
  }, [matchInfo, socket, matchId]);

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Socket listeners
  useEffect(() => {
    if (!socket || !matchId) return;

    const numericMatchId = parseInt(matchId);
    socket.emit('join_match', numericMatchId);

    const handleNewMessage = (message: Message) => {
      setMessages(prev => [...prev, message]);
      setIsTyping(false);
      
      // If we received a message while in chat, mark it as read immediately
      if (message.senderId !== user?.id && matchInfo) {
        socket.emit('mark_read', { 
          matchId: numericMatchId, 
          otherUserId: message.senderId 
        });
      }
    };

    const handleTyping = () => setIsTyping(true);
    const handleStopTyping = () => setIsTyping(false);
    
    const handleMessagesRead = () => {
      setMessages(prev => prev.map(m => m.senderId === user?.id ? { ...m, read: 1 } : m));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.emit('leave_match', numericMatchId);
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket, matchId, matchInfo, user?.id]);

  // Focus input on load
  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  const handleSend = async () => {
    if (!newMessage.trim() || !matchId) return;

    const content = newMessage.trim();
    setNewMessage('');

    try {
      const { message, otherUserId } = await api.sendMessage(parseInt(matchId), content);
      setMessages(prev => [...prev, message]);

      if (socket) {
        socket.emit('send_message', {
          matchId: parseInt(matchId),
          message,
          otherUserId
        });
        socket.emit('stop_typing', { matchId: parseInt(matchId) });
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setNewMessage(content); // Restore message on error
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = () => {
    if (socket && matchId) {
      socket.emit('typing', { matchId: parseInt(matchId) });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { matchId: parseInt(matchId) });
      }, 2000);
    }
  };

  const getProfileImage = (photo: string) => {
    if (!photo) return '';
    if (photo.startsWith('http')) return photo;
    return photo;
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr + 'Z').toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr + 'Z');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Hoje';
    if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  // Group messages by date
  const getDateForMessage = (msg: Message) => {
    return new Date(msg.createdAt + 'Z').toDateString();
  };

  if (loading) {
    return (
      <div className="chat-page">
        <div className="chat-header">
          <button className="back-btn" onClick={() => navigate('/matches')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div className="chat-user-info">
            <div className="skeleton-box skeleton-avatar" style={{width: 40, height: 40}} />
            <div className="skeleton-box skeleton-match-name" style={{width: 100, marginLeft: 12}} />
          </div>
        </div>
        <div className="chat-messages">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`skeleton-message ${i % 2 === 0 ? 'received' : 'sent'}`}>
              <div className="skeleton-box skeleton-bubble" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-header">
        <button className="back-btn" onClick={() => navigate('/matches')} aria-label="Voltar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        {matchInfo && (
          <div className="chat-user-info">
            <div className="chat-avatar">
              {getProfileImage(matchInfo.profilePhoto) ? (
                <img src={getProfileImage(matchInfo.profilePhoto)} alt={matchInfo.name} />
              ) : (
                <span>{matchInfo.name.charAt(0)}</span>
              )}
              {onlineUsers.has(matchInfo.userId) && <span className="online-dot" />}
            </div>
            <div className="chat-user-details">
              <h3>{matchInfo.name}</h3>
              <span className="chat-status">
                {isTyping ? 'Digitando...' : onlineUsers.has(matchInfo.userId) ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </div>
            <h3>Inicio da conversa</h3>
            <p>Diga ola para {matchInfo?.name}</p>
          </div>
        )}

        {messages.map((msg, index) => {
          const showDate = index === 0 ||
            getDateForMessage(msg) !== getDateForMessage(messages[index - 1]);
          const isSent = msg.senderId === user?.id;

          return (
            <React.Fragment key={msg.id}>
              {showDate && (
                <div className="date-separator">
                  <span>{formatDateSeparator(msg.createdAt)}</span>
                </div>
              )}
              <div className={`message ${isSent ? 'sent' : 'received'}`}>
                <div className="message-bubble">
                  <p>{msg.content}</p>
                  <span className="message-time">
                    {formatTime(msg.createdAt)}
                    {isSent && (
                      <span className="message-read-indicator">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {msg.read ? (
                            <>
                              <polyline points="18 7 11 14 6 9" opacity="0.5"/>
                              <polyline points="20 7 13 14 8 9"/>
                            </>
                          ) : (
                            <polyline points="20 6 9 17 4 12"/>
                          )}
                        </svg>
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {isTyping && (
          <div className="message received">
            <div className="message-bubble typing-bubble">
              <div className="typing-indicator">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <input
          ref={inputRef}
          type="text"
          placeholder="Digite sua mensagem..."
          value={newMessage}
          onChange={e => {
            setNewMessage(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyPress}
          id="chat-input"
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!newMessage.trim()}
          id="send-button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
