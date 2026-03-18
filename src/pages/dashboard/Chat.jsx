
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Bell, Send, Paperclip, Mic, Video, Phone, X, Smile, Image, 
  File, Download, Search, MoreHorizontal, Circle, ArrowLeft, Plus
} from 'lucide-react';
import { API_BASE_URL } from '../../lib/api';
import AppointmentsTab from './Appointments';
// Enhanced EmojiPicker component
const EmojiPicker = ({ onEmojiClick, theme, height, width, emojiAsFile, setEmojiAsFile, onClose }) => {
  const emojis = [
    '😀', '😂', '😍', '🤔', '👍', '❤️', '🎉', '🔥', '👋', '💯',
    '😊', '😢', '😡', '🤗', '👏', '🙌', '💪', '🎯', '⭐', '🌟',
    '💯', '🔥', '💖', '💝', '🎊', '🎈', '🎁', '🏆', '🥇', '✨'
  ];
  
  return (
    <div className={`p-3 rounded-lg shadow-lg border ${
      theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
    }`} style={{ width: width || 280, height: height || 200 }}>
      {/* Header with close button */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-600 dark:text-gray-400">Emoji Mode:</span>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <button
              onClick={() => setEmojiAsFile(false)}
              className={`px-2 py-1 text-xs rounded ${
                !emojiAsFile 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              Text
            </button>
            <button
              onClick={() => setEmojiAsFile(true)}
              className={`px-2 py-1 text-xs rounded ${
                emojiAsFile 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              File
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400"
            title="Close emoji picker"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-5 gap-2">
        {emojis.map((emoji, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Emoji button clicked:', emoji);
              onEmojiClick({ emoji });
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xl transition-colors"
            type="button"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

import { getAccessToken, getUserData } from '../../lib/tokenManager';

const ChatTab = ({ darkMode = false, onChatRoomStateChange }) => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showChatRoom, setShowChatRoom] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  
  
  // Conversations from backend
  const [conversations, setConversations] = useState([]);
  const [wsError, setWsError] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  const userDataRef = useRef(null);
  // store "me" (own user id) returned by history API for reliable identification
  const myIdRef = useRef(null);
  const chatWsRef = useRef(null);
  const [chatWsConnected, setChatWsConnected] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const [processingMessage, setProcessingMessage] = useState(false);
  const [processedMessageIds, setProcessedMessageIds] = useState(new Set());
  const processedMessageIdsRef = useRef(new Set());
  
  // User status WebSocket
  const statusWsRef = useRef(null);
  const [statusWsConnected, setStatusWsConnected] = useState(false);
  const [userStatuses, setUserStatuses] = useState({}); // Store user statuses by user_id
  const [statusUpdateTrigger, setStatusUpdateTrigger] = useState(0); // Force re-render on status updates

  // Derived chat users list for UI from conversations
  const chatUsers = useMemo(() => {
    console.log('🔄 Recalculating chatUsers with latest userStatuses:', userStatuses);
    return (conversations || []).map((c) => {
      const user = c.user || {};
      const uid = Number(user.id);
      const realTimeStatus = userStatuses[uid];
      // keep other logic the same, but use uid for lookups
      const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || `User ${uid}`;
      const initials = `${(user.first_name || '').charAt(0)}${(user.last_name || '').charAt(0)}`.toUpperCase() || 'U';
      
      // Handle last message - show text if available, otherwise show media indicator
      let lastMsg = c.last_message?.message || '';
      if (!lastMsg && c.last_message) {
        // Check if the last message has media (photo/file)
        if (c.last_message.has_media || c.last_message.file_url || c.last_message.image_url || c.last_message.file || c.last_message.image) {
          lastMsg = '📷 Photo';
        }
      }
      
      const time = c.last_message_time ? new Date(c.last_message_time).toLocaleString() : '';
      
      // Priority: real-time status from userStatuses, fallback to conversation data
      const isOnline = realTimeStatus ? realTimeStatus.status === 'online' : user.status === 'online';
      const lastSeen = realTimeStatus ? realTimeStatus.last_seen : user.last_seen;
      
      console.log(`👤 User ${user.id} (${name}): online=${isOnline}, lastSeen=${lastSeen}`);
      
      return {
        id: String(uid),
        name,
        role: user.username || '',
        avatar: initials,
        photoUrl: user.profile_image || null,
        lastMessage: lastMsg,
        time,
        unread: c.unread_count || 0,
        online: isOnline,
        lastSeen: lastSeen,
        messages: [],
      };
    });
  }, [conversations, userStatuses, statusUpdateTrigger]);

  const currentChat = chatUsers.find(chat => chat.id === selectedChat);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [callStatus, setCallStatus] = useState(null);
  const [callType, setCallType] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessingScreenshot, setIsProcessingScreenshot] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [modalImageName, setModalImageName] = useState('');
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [emojiAsFile, setEmojiAsFile] = useState(false); // Toggle for emoji as file
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Do not use any dummy messages on chat change
  useEffect(() => {
    setMessages([]);
    processedMessageIdsRef.current.clear();
    setProcessedMessageIds(new Set());
  }, [selectedChat]);

  // Scroll to bottom when messages change
  useEffect(() => {
    // Use a small delay to ensure DOM is updated
    setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    // Also wait for images to load and scroll again to ensure we're at the very bottom
    const timer = setTimeout(async () => {
      await waitForImagesToLoad(messagesContainerRef.current, 2000);
      scrollToBottom(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [messages]);

  // Facebook Messenger-style scroll behavior
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop } = container;
      
      // Load older messages when scrolled to top
      if (scrollTop < 100 && hasMoreMessages && !isLoadingOlderMessages) {
        loadOlderMessages();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMoreMessages, isLoadingOlderMessages]);

  // Load older messages function
  const loadOlderMessages = async () => {
    if (!selectedChat || isLoadingOlderMessages) return;
    
    setIsLoadingOlderMessages(true);
    try {
      const token = getAccessToken();
      const nextPage = currentPage + 1;
      const response = await fetch(`${API_BASE_URL}/api/history/${selectedChat}/?page=${nextPage}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const newMessages = data.chat || [];
        
        if (newMessages.length === 0) {
          setHasMoreMessages(false);
        } else {
          // Prepend older messages to the beginning
          const myUserId = Number(myIdRef.current || userDataRef.current?.id || 0);
          const nameForPartner = currentChat?.name || 'User';
          
          const mappedNewMessages = newMessages.map((m) => {
            const isSentByMe = Number(m.sender) === myUserId;
            return {
              id: m.id,
              sender: isSentByMe ? 'You' : nameForPartner,
              message: m.message || '',
              time: m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
              type: isSentByMe ? 'sent' : 'received',
              hasMedia: m.has_media,
              fileUrl: m.file_url,
              imageUrl: m.image_url,
              files: m.has_media ? [{
                name: (m.file_url || m.file) ? (m.file_url || m.file).split('/').pop() : ((m.image_url || m.image) ? (m.image_url || m.image).split('/').pop() : 'file'),
                type: (m.image_url || m.image) ? 'image' : ((m.file_url || m.file) ? getFileTypeFromUrl(m.file_url || m.file) : 'file'),
                url: m.file_url || m.image_url || m.file || m.image
              }] : undefined,
            };
          });
          
          setMessages(prev => [...mappedNewMessages, ...prev]);
          setCurrentPage(nextPage);
        }
      }
    } catch (error) {
      console.error('Failed to load older messages:', error);
    } finally {
      setIsLoadingOlderMessages(false);
    }
  };
  
  // Cleanup processed message IDs periodically to prevent memory leaks
  useEffect(() => {
    const cleanup = setInterval(() => {
      processedMessageIdsRef.current.clear();
      setProcessedMessageIds(new Set());
    }, 30000); // Clear every 30 seconds
    
    return () => clearInterval(cleanup);
  }, []);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmojiPicker && !event.target.closest('.emoji-picker-container')) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

  const scrollToBottom = (force = false) => {
    if (messagesEndRef.current) {
      // Use scrollTop for more reliable scrolling to absolute bottom
      const container = messagesContainerRef.current;
      if (container) {
        // Scroll to absolute bottom
        container.scrollTop = container.scrollHeight;
      } else {
        // Fallback to scrollIntoView
        messagesEndRef.current.scrollIntoView({ behavior: force ? "auto" : "smooth" });
      }
    }
  };

  // File upload API function
  const uploadFile = async (file, receiverId, message = '') => {
    const token = getAccessToken();
    const formData = new FormData();
    formData.append('file', file);
    if (message.trim()) {
      formData.append('message', message.trim());
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload_file/${receiverId}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`File upload failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('File upload successful:', result);
      return result;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    const text = newMessage.trim();
    
    // If there's a file, upload it first
    if (selectedFile) {
      try {
        // Add optimistic message for file upload
        const optimisticId = `temp_file_${Date.now()}_${Math.random()}`;
        const fileType = getFileTypeFromUrl(selectedFile.name);
        const optimisticMessage = {
          id: optimisticId,
          sender: 'You',
          message: text || '',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'sent',
          isOptimistic: true,
          localTimestamp: Date.now(),
          hasMedia: true,
          files: [{
            name: selectedFile.name,
            type: fileType,
            url: URL.createObjectURL(selectedFile), // Create temporary URL for preview
            size: selectedFile.size
          }]
        };
        
        setMessages((prev) => [...prev, optimisticMessage]);
        
        // Upload file to API
        await uploadFile(selectedFile, selectedChat, text);
        
        // Clear form
        setNewMessage('');
        setSelectedFile(null);
        return;
      } catch (error) {
        console.error('File upload failed:', error);
        // Remove optimistic message on error
        setMessages((prev) => prev.filter(msg => msg.id !== optimisticId));
        alert('Failed to upload file. Please try again.');
        return;
      }
    }
    
    // Handle text-only messages (existing logic)
    const optimisticId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticMessage = {
      id: optimisticId,
      sender: 'You',
      message: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'sent', // This ensures it appears on the right with blue color
      isOptimistic: true, // Flag to identify optimistic messages
      localTimestamp: Date.now(),
    };
    
    setMessages((prev) => [...prev, optimisticMessage]);
    
    // Send via WebSocket and include temp id so server can echo it back if supported
    try {
      if (chatWsRef.current && chatWsRef.current.readyState === WebSocket.OPEN) {
        const payload = {
          type: 'text_message',
          message: text,
          temp_id: optimisticId,
        };
        chatWsRef.current.send(JSON.stringify(payload));
      }
    } catch (e) {
      console.error('Failed to send WS message', e);
    }
    setNewMessage('');
    setSelectedFile(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle paste events for screenshots
  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        
        const file = item.getAsFile();
        if (file) {
          console.log('Screenshot pasted:', file);
          setIsProcessingScreenshot(true);
          
          // Set the pasted image as selected file
          setSelectedFile(file);
          
          // Auto-send the screenshot (like WhatsApp behavior)
          setTimeout(async () => {
            try {
              await handleSendMessage();
            } finally {
              setIsProcessingScreenshot(false);
            }
          }, 100);
        }
        break;
      }
    }
  };

  // Wait for images under messages container to load (resolve early on timeout)
  const waitForImagesToLoad = (container, timeout = 2000) => {
    return new Promise((resolve) => {
      if (!container) return resolve();
      const imgs = Array.from(container.querySelectorAll('img'));
      if (imgs.length === 0) return resolve();

      let settled = 0;
      const onSettled = () => {
        settled += 1;
        if (settled >= imgs.length) resolve();
      };

      const t = setTimeout(() => {
        // cleanup listeners and resolve anyway
        imgs.forEach(img => {
          img.removeEventListener('load', onSettled);
          img.removeEventListener('error', onSettled);
        });
        resolve();
      }, timeout);

      imgs.forEach((img) => {
        if (img.complete) {
          onSettled();
        } else {
          img.addEventListener('load', () => { clearTimeout(t); onSettled(); });
          img.addEventListener('error', () => { clearTimeout(t); onSettled(); });
        }
      });
    });
  };

  // When user focuses the message input, reload the absolute latest messages for the selected chat.
  const lastFocusLoadRef = useRef(0);
  const loadLatestMessagesOnFocus = async () => {
    if (!selectedChat || loadingMessages) return;
    // throttle to avoid rapid repeated loads (1.5s)
    const now = Date.now();
    if (now - lastFocusLoadRef.current < 1500) return;
    lastFocusLoadRef.current = now;
    try {
      await fetchHistory(selectedChat);
      // wait for images to render so scrollToBottom lands at the real bottom
      await waitForImagesToLoad(messagesContainerRef.current, 2500);
      // Use multiple animation frames to ensure proper scrolling to absolute bottom
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom(true); // Force scroll to absolute bottom
        });
      });
    } catch (err) {
      console.error('Failed to load latest messages on focus', err);
    }
  };
  
  const handleEmojiClick = (emojiData) => {
    console.log('Emoji clicked:', emojiData);
    
    if (emojiAsFile) {
      // Send emoji as file
      sendEmojiAsFile(emojiData.emoji);
    } else {
      // Send emoji as text (standard approach)
      setNewMessage(prev => prev + emojiData.emoji);
    }
    
    // Keep emoji picker open for multiple selections
    // setShowEmojiPicker(false); // Removed this line
  };

  // Alternative: Send emoji as file (if you prefer this approach)
  const sendEmojiAsFile = async (emoji) => {
    try {
      // Create a canvas with the emoji
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 64;
      canvas.height = 64;
      
      // Set font and draw emoji
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 32, 32);
      
      // Convert to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], `emoji_${emoji}.png`, { type: 'image/png' });
      
      // Set as selected file and send
      setSelectedFile(file);
      setTimeout(() => handleSendMessage(), 100);
    } catch (error) {
      console.error('Failed to create emoji file:', error);
      // Fallback to text emoji
      setNewMessage(prev => prev + emoji);
    }
  };

  // Smooth download function
  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to opening in new tab
      window.open(url, '_blank');
    }
  };

  // Handle image click for modal
  const handleImageClick = (url, name) => {
    setModalImageUrl(url);
    setModalImageName(name);
    setShowImageModal(true);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setTimeout(() => document.querySelector('input[type="text"]')?.focus(), 100);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  const startCall = (type) => {
    setCallType(type);
    setCallStatus('calling');
    
    setTimeout(() => {
      setCallStatus('in-progress');
    }, 5000);
  };

  const endCall = () => {
    setCallStatus(null);
    setCallType(null);
  };

  const getFileTypeFromUrl = (url) => {
    if (!url) return 'file';
    const extension = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      return 'image';
    }
    return extension || 'file';
  };

  const renderFileIcon = (type) => {
    switch(type) {
      case 'pdf': return <File className="w-4 h-4 text-red-500" />;
      case 'doc': case 'docx': return <File className="w-4 h-4 text-blue-500" />;
      case 'xls': case 'xlsx': return <File className="w-4 h-4 text-green-500" />;
      case 'jpg': case 'jpeg': case 'png': case 'gif': case 'image': return <Image className="w-4 h-4 text-purple-500" />;
      default: return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredChats = chatUsers.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.role || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle profile click for mobile
  const handleProfileClick = (chatId) => {
    setSelectedChat(chatId);
    setShowChatRoom(true);
  };

  // Handle back button for mobile
  const handleBackToList = () => {
    setShowChatRoom(false);
  };

  // Open Add modal
  const openAddModal = () => {
    setShowAddModal(true);
  };

  // Close Add modal
  const closeAddModal = () => {
    setShowAddModal(false);
    setAddSearch('');
  };

  // Fetch doctors for Add modal
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoadingDoctors(true);
        const token = getAccessToken();
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/api/doctorlist/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setDoctors(Array.isArray(data) ? data : (data.results || []));
        }
      } catch (e) {
        console.error('Failed to load doctors', e);
      } finally {
        setLoadingDoctors(false);
      }
    };

    if (showAddModal) {
      fetchDoctors();
    }
  }, [showAddModal]);

  const filteredDoctorsForAdd = doctors.filter(d => {
    const q = addSearch.toLowerCase();
    const name = `${d.first_name || ''} ${d.last_name || ''}`.toLowerCase();
    return name.includes(q) || (d.specialization || '').toLowerCase().includes(q);
  });

  const ensureConversationForUser = (partner) => {
    console.log('ensureConversationForUser called with partner:', partner);
    if (!partner || !partner.id) {
      console.log('No partner or partner.id, returning');
      return;
    }
    const userIdNum = Number(partner.id);
    console.log('Looking for userIdNum:', userIdNum);
    
    setConversations(prev => {
      console.log('Current conversations:', prev);
      
      // More precise check - ensure we're matching exact user ID, not just any existing conversation
      const exists = (prev || []).some(c => 
        c?.user && Number(c.user.id) === userIdNum
      );
      console.log('Conversation exists:', exists);
      
      if (exists) {
        // If conversation exists, make sure it's the correct one
        const existingConv = prev.find(c => 
          c?.user && Number(c.user.id) === userIdNum
        );
        console.log('Found existing conversation:', existingConv);
        if (existingConv) {
          // Update existing conversation with latest partner info
          return prev.map(c => 
            (c?.user && Number(c.user.id) === userIdNum)
              ? {
                  ...c,
                  user: {
                    ...c.user,
                    first_name: partner.first_name || c.user.first_name,
                    last_name: partner.last_name || c.user.last_name,
                    username: partner.username || c.user.username,
                    profile_image: partner.profile_image || c.user.profile_image,
                  }
                }
              : c
          );
        }
        return prev;
      }
      
      // Build minimal conversation object so UI can render immediately
      const firstName = partner.first_name || (partner.name ? String(partner.name).split(' ')[0] : '');
      const lastName = partner.last_name || (partner.name ? String(partner.name).split(' ').slice(1).join(' ') : '');
      const username = partner.username || partner.role || '';
      const profile_image = partner.profile_image || null;
      
      const newConv = {
        user: {
          id: userIdNum,
          first_name: firstName,
          last_name: lastName,
          username,
          profile_image,
          status: 'offline',
          last_seen: null,
        },
        last_message: null,
        last_message_time: null,
        unread_count: 0,
      };
      
      console.log('Creating new conversation:', newConv);
      return [...(prev || []), newConv];
    });
  };

  const startChatWith = (partner) => {
    if (!partner) return;
    const id = typeof partner === 'number' || typeof partner === 'string' ? String(partner) : String(partner.id);
    if (!id) return;
    if (typeof partner === 'object') {
      ensureConversationForUser(partner);
    }
    setSelectedChat(id);
    setShowChatRoom(true);
    setShowAddModal(false);
  };

  // Notify parent component when chat room state changes
  useEffect(() => {
    if (onChatRoomStateChange) {
      onChatRoomStateChange(showChatRoom);
    }
  }, [showChatRoom, onChatRoomStateChange]);

  // Initialize userData
  useEffect(() => {
    try {
      const userData = getUserData();
      userDataRef.current = userData || {};
      console.log('Initialized user data:', userDataRef.current);
    } catch (error) {
      console.error('Error getting user data:', error);
      userDataRef.current = {};
    }
  }, []);

  // Expose a helper to start chat from an appointment payload
  useEffect(() => {
    const handler = (appointment) => {
      try {
        if (!appointment) return;
        const role = String(userDataRef.current?.role || '').toUpperCase();
        const partnerId = role === 'DOCTOR'
          ? (appointment.user_id || appointment.patient_id)
          : (appointment.doctor_id || appointment.doctor_user_id || appointment.doctor?.id);
        if (!partnerId) {
          console.warn('No partner id found in appointment to start chat');
          return;
        }
        const rawName = role === 'DOCTOR' ? (appointment.user_name || '') : (appointment.doctor_name || '');
        const cleaned = rawName.replace(/^Dr\.?\s*/i, '').trim();
        const parts = cleaned.split(/\s+/);
        const first_name = parts[0] || cleaned || '';
        const last_name = parts.slice(1).join(' ');
        const partner = {
          id: partnerId,
          first_name,
          last_name,
          username: role === 'DOCTOR' ? 'Patient' : 'Doctor',
          profile_image: appointment.user_profile_image || appointment.doctor_profile_image || null,
        };
        ensureConversationForUser(partner);

        // Defer setSelectedChat so ensureConversationForUser state update flushes first
        requestAnimationFrame(() => {
          setSelectedChat(String(partnerId));
          setShowChatRoom(true);
          setShowAddModal(false);
        });
      } catch (e) {
        console.error('Failed to start chat from appointment:', e);
      }
    };

    window.startChatWithAppointment = handler;
    return () => {
      try { delete window.startChatWithAppointment; } catch {}
    };
  }, []);
  // Fetch conversation history via HTTP - FIXED MESSAGE ALIGNMENT
  const fetchHistory = async (userId) => {
    if (!userId) return;
    setLoadingMessages(true);
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/api/history/${userId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.status}`);
      }
        const data = await response.json();
        console.log('Full history API response:', data);
        
        // save "me" returned by API so websocket handling can identify our own messages
        myIdRef.current = Number(data.me || userDataRef.current?.id || 0);
        console.log('Saved my id from history API:', myIdRef.current);
        const myUserId = Number(data.me || userDataRef.current?.id);  // ← CHANGED: use data.me
        const nameForPartner = currentChat?.name || 'User';
        const arr = Array.isArray(data.chat) ? data.chat : [];  // ← CHANGED: use data.chat
        
        console.log('Chat messages from history:', arr);
  
        // Sort by timestamp ascending (oldest first) to show latest messages at bottom
        arr.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
        const mapped = arr.map((m) => {
          const isSentByMe = Number(m.sender) === myUserId;
          
          // Debug logging for media messages
          if (m.has_media || m.file_url || m.image_url || m.file || m.image) {
            console.log('History message with media:', {
              id: m.id,
              has_media: m.has_media,
              file_url: m.file_url,
              image_url: m.image_url,
              file: m.file,
              image: m.image,
              message: m.message,
              full_message_object: m
            });
          }
          
          // Debug all message properties
          console.log('Processing history message:', {
            id: m.id,
            sender: m.sender,
            message: m.message,
            has_media: m.has_media,
            file_url: m.file_url,
            image_url: m.image_url,
            file: m.file,
            image: m.image,
            timestamp: m.timestamp,
            all_keys: Object.keys(m)
          });
          
          // Enhanced media detection - check for any media indicators
          const hasMedia = m.has_media || m.file_url || m.image_url || m.file || m.image;
          const fileUrl = m.file_url || m.file || null;
          const imageUrl = m.image_url || m.image || null;
          
          const mappedMessage = {
            id: m.id,
            sender: isSentByMe ? 'You' : nameForPartner,
            message: m.message || '',
            time: m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            timestampISO: m.timestamp || new Date().toISOString(),
            type: isSentByMe ? 'sent' : 'received',  // This determines alignment
            hasMedia: hasMedia,
            fileUrl: fileUrl,
            imageUrl: imageUrl,
            files: hasMedia ? [{
              name: fileUrl ? fileUrl.split('/').pop() : (imageUrl ? imageUrl.split('/').pop() : 'file'),
              type: imageUrl ? 'image' : (fileUrl ? getFileTypeFromUrl(fileUrl) : 'file'),
              url: fileUrl || imageUrl
            }] : undefined,
          };
          
          // Debug the final mapped message
          if (m.has_media) {
            console.log('Final mapped message with media:', mappedMessage);
          }
          
          return mappedMessage;
        });
        setMessages(mapped);
    } catch (e) {
      console.error('History fetch failed', e);
    } finally {
      setLoadingMessages(false);
    }
  };

  // WebSocket: connect and listen - FIXED MESSAGE ALIGNMENT
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const wsProtocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
    const baseUrl = API_BASE_URL.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}://${baseUrl}/ws/conversations/?token=${token}`;
    let socket;
    try {
      socket = new WebSocket(wsUrl);
    } catch (e) {
      setWsError('Failed to initialize WebSocket');
      return;
    }

    socket.onopen = () => {
      setWsConnected(true);
      setWsError(null);
      wsRef.current = socket;
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Conversation WS received:', data);
        
        if (data?.type === 'conversation_list' && Array.isArray(data.conversations)) {
          setConversations(data.conversations);
          
          // Update user statuses from conversation list (normalize ids)
          const statusUpdates = {};
          data.conversations.forEach(conv => {
            if (conv.user && conv.user.id != null) {
              const uid = Number(conv.user.id);
              statusUpdates[uid] = {
                status: conv.user.status,
                last_seen: conv.user.last_seen
              };
            }
          });
          console.log('Updating user statuses from conversation list (normalized):', statusUpdates);
          setUserStatuses(prev => ({ ...prev, ...statusUpdates }));
          setStatusUpdateTrigger(s => s + 1);
          
          // Set a default selection if none
          if (!selectedChat && data.conversations.length > 0) {
            const firstId = String(data.conversations[0]?.user?.id);
            if (firstId) setSelectedChat(firstId);
          }
        }
        // REMOVED: Individual message handling to prevent duplicates
        // Messages are now only handled by the per-chat WebSocket connection
      } catch (err) {
        console.error('WS message parse error:', err);
      }
    };

    socket.onerror = () => {
      setWsConnected(false);
      setWsError('WebSocket connection error');
    };

    socket.onclose = () => {
      setWsConnected(false);
    };

    return () => {
      try { socket && socket.close(); } catch {}
      wsRef.current = null;
    };
  }, []);

  // Status WebSocket: connect and listen for user status updates
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      console.log('No token available for status WebSocket');
      return;
    }
    
    const wsProtocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
    const baseUrl = API_BASE_URL.replace(/^https?:\/\//, '');
    const statusWsUrl = `${wsProtocol}://${baseUrl}/ws/status/?token=${token}`;
    console.log('Attempting to connect to status WebSocket:', statusWsUrl);
    
    let statusSocket;
    try {
      statusSocket = new WebSocket(statusWsUrl);
    } catch (e) {
      console.error('Failed to initialize status WebSocket:', e);
      return;
    }

    statusSocket.onopen = () => {
      console.log('✅ Status WebSocket connected successfully');
      setStatusWsConnected(true);
      statusWsRef.current = statusSocket;
    };

    statusSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📡 Status WS received:', data);
        
        if (data?.type === 'user_status') {
          const { user_id, status, last_seen } = data;
          console.log(`🔄 Updating user ${user_id} status to ${status}`, last_seen ? `(last seen: ${last_seen})` : '');
          
          // Update user statuses immutably to ensure React detects the change
          setUserStatuses(prev => {
            const newStatuses = {
              ...prev,
              [user_id]: {
                status,
                last_seen,
                timestamp: Date.now() // Add timestamp to ensure uniqueness
              }
            };
            console.log('📊 Updated user statuses:', newStatuses);
            return newStatuses;
          });
        }
      } catch (err) {
        console.error('❌ Status WS message parse error:', err);
      }
    };

    statusSocket.onerror = (error) => {
      console.error('❌ Status WebSocket error:', error);
      setStatusWsConnected(false);
    };

    statusSocket.onclose = (event) => {
      console.log('🔌 Status WebSocket disconnected:', event.code, event.reason);
      setStatusWsConnected(false);
    };

    return () => {
      console.log('🧹 Cleaning up status WebSocket');
      try { statusSocket && statusSocket.close(); } catch {}
      statusWsRef.current = null;
    };
  }, []);

  // Open per-chat WebSocket for sending/receiving live messages - FIXED MESSAGE ALIGNMENT
  // Open per-chat WebSocket for sending/receiving live messages - FIXED MESSAGE ALIGNMENT
  useEffect(() => {
    const token = getAccessToken();
    if (!selectedChat || !token) {
      if (chatWsRef.current) {
        try { chatWsRef.current.close(); } catch {}
      }
      setChatWsConnected(false);
      return;
    }
    
    // Close existing connection
    if (chatWsRef.current) {
      try { chatWsRef.current.close(); } catch {}
    }
    
    // messages are cleared by the selectedChat effect above (do NOT clear here)
    
    const wsProtocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
    const baseUrl = API_BASE_URL.replace(/^https?:\/\//, '');
    const url = `${wsProtocol}://${baseUrl}/ws/chat/${selectedChat}/?token=${token}`;
    let sock;
    try {
      sock = new WebSocket(url);
    } catch (e) {
      console.error('Chat WS init failed', e);
      setChatWsConnected(false);
      return;
    }
    chatWsRef.current = sock;
    
    sock.onopen = async () => {
      console.log('Chat WebSocket connected for user:', selectedChat);
      setChatWsConnected(true);
      
      // Automatically mark messages as seen when chat opens
      try {
        if (sock.readyState === WebSocket.OPEN) {
          const markSeenMessage = JSON.stringify({ type: 'mark_seen' });
          sock.send(markSeenMessage);
          console.log('Sent mark_seen message to server');
        }
      } catch (error) {
        console.error('Failed to send mark_seen message:', error);
      }
      
      // Fetch history after WebSocket connects
      await fetchHistory(selectedChat);
      // Wait for images to load and scroll to bottom
      await waitForImagesToLoad(messagesContainerRef.current, 2000);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom(true);
        });
      });
    };
    
    sock.onclose = () => {
      console.log('Chat WebSocket disconnected');
      setChatWsConnected(false);
    };
    
    sock.onerror = (err) => {
      console.error('Chat WebSocket error:', err);
      setChatWsConnected(false);
    };
    
    sock.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Chat WS received:', data.type || 'message');
        console.log('Full WebSocket data:', data);
        
        // Determine current user id using saved "me" from history API if available,
        // fallback to token-stored userDataRef
        const currentUserId = Number(myIdRef.current || userDataRef.current?.id || 0);

        // Extract message data
        let messageData = null;
        if (data.type === 'message' && data.data) {
          messageData = data.data;
        } else if (data.message || data.sender_id) {
          messageData = data;
        }
        
        if (!messageData) return;
        
        const senderId = Number(messageData.sender_id || messageData.sender);
        const text = messageData.message || '';
        const timestamp = messageData.timestamp || messageData.time || new Date().toISOString();
        const messageId = messageData.id || `msg_${Date.now()}`;
        // Enhanced media detection for WebSocket messages
        const hasMedia = messageData.has_media || messageData.file_url || messageData.image_url || messageData.file || messageData.image || false;
        const fileUrl = messageData.file_url || messageData.file || null;
        const imageUrl = messageData.image_url || messageData.image || null;
        
        console.log('Message data details:', {
          hasMedia,
          fileUrl,
          imageUrl,
          messageData
        });
        
        // Check if this is our own message (optimistic update replacement)
        const isSentByMe = senderId === currentUserId;
        
        setMessages((prev) => {
          // Check if message already exists to prevent duplicates (by ID)
          const exists = prev.some(m => m.id === messageId);
          if (exists) {
            console.log('Message already exists, skipping:', messageId);
            return prev;
          }
          
          // Additional check: prevent processing the same message twice using ref for immediate check
          if (processedMessageIdsRef.current.has(messageId)) {
            console.log('Message already processed, skipping:', messageId);
            return prev;
          }
          
          // Mark this message as processed (both ref and state)
          processedMessageIdsRef.current.add(messageId);
          setProcessedMessageIds(prev => new Set([...prev, messageId]));
          
          // If this is our own message, replace the optimistic version
          if (isSentByMe) {
            // Check if server sent back temp_id to match with optimistic message
            const tempId = messageData.temp_id || messageData.tempId;
            
            // Try multiple strategies to find the optimistic message:
            // 1. By temp_id if server sent it back
            // 2. By matching message content and recent timestamp (within last 5 seconds)
            // 3. By finding any recent optimistic message (last resort)
            let optimisticIndex = -1;
            
            if (tempId) {
              // Match by temp_id
              optimisticIndex = prev.findIndex(msg => msg.id === tempId && msg.isOptimistic);
              console.log('Looking for optimistic message by temp_id:', tempId, optimisticIndex !== -1);
            }
            
            if (optimisticIndex === -1) {
              // Match by content and recent timestamp
              const messageTime = new Date(timestamp).getTime();
              optimisticIndex = prev.findIndex(msg => {
                if (!msg.isOptimistic) return false;
                
                // Check if message was sent recently (within 5 seconds)
                const msgTime = msg.localTimestamp || 0;
                const timeDiff = Math.abs(messageTime - msgTime);
                if (timeDiff > 5000) return false; // Too old
                
                // Match by content
                if (hasMedia && msg.hasMedia) {
                  // Both have media - consider it a match
                  return true;
                } else if (!hasMedia && !msg.hasMedia) {
                  // Both are text - match by message content
                  return msg.message === text;
                }
                return false;
              });
              console.log('Looking for optimistic message by content match:', optimisticIndex !== -1);
            }
            
            if (optimisticIndex === -1) {
              // Last resort: find any recent optimistic message (within last 3 seconds)
              const messageTime = new Date(timestamp).getTime();
              optimisticIndex = prev.findIndex((msg, idx) => {
                if (!msg.isOptimistic) return false;
                const msgTime = msg.localTimestamp || 0;
                const timeDiff = Math.abs(messageTime - msgTime);
                // Only match if it's the most recent optimistic message and very recent
                return timeDiff < 3000 && idx === prev.length - 1;
              });
              console.log('Looking for optimistic message (last resort):', optimisticIndex !== -1);
            }
            
            if (optimisticIndex !== -1) {
              console.log('Replacing optimistic message with real message at index:', optimisticIndex);
              const newMessages = [...prev];
              newMessages[optimisticIndex] = {
                id: messageId,
                sender: 'You',
                message: text,
                time: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'sent',
                hasMedia,
                fileUrl,
                imageUrl,
                files: hasMedia ? [{
                  name: fileUrl ? fileUrl.split('/').pop() : (imageUrl ? imageUrl.split('/').pop() : 'file'),
                  type: imageUrl ? 'image' : (fileUrl ? getFileTypeFromUrl(fileUrl) : 'file'),
                  url: fileUrl || imageUrl
                }] : undefined,
              };
              return newMessages;
            } else {
              console.log('No optimistic message found to replace, but this is our own message - adding as new');
            }
          }
          
          // For received messages or sent messages without optimistic version
          const newMessage = {
            id: messageId,
            sender: isSentByMe ? 'You' : (currentChat?.name || 'User'),
            message: text,
            time: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: isSentByMe ? 'sent' : 'received',
            hasMedia,
            fileUrl,
            imageUrl,
            files: hasMedia ? [{
              name: fileUrl ? fileUrl.split('/').pop() : (imageUrl ? imageUrl.split('/').pop() : 'file'),
              type: imageUrl ? 'image' : (fileUrl ? getFileTypeFromUrl(fileUrl) : 'file'),
              url: fileUrl || imageUrl
            }] : undefined,
          };
          
          console.log('Adding new message:', isSentByMe ? 'sent' : 'received', hasMedia ? 'with file' : '');
          return [...prev, newMessage];
        });
        
      } catch (e) {
        console.error('Chat WS message parse error', e);
      }
    };

    return () => {
      if (chatWsRef.current) {
        chatWsRef.current.close();
        chatWsRef.current = null;
      }
      // do not clear messages here; selectedChat effect handles that
      setChatWsConnected(false);
    };
  }, [selectedChat, currentChat]);

  // Message alignment function - FIXED: Sent messages on right (blue), received on left (green)
  // Message alignment: sent = RIGHT, received = LEFT
const getMessageAlignment = (messageType) => {
  return messageType === 'sent' ? 'justify-end' : 'justify-start';
};

// Message bubble styling: sent = BLUE (right), received = GREEN (left)
const getMessageBubbleStyle = (messageType, darkMode) => {
  if (messageType === 'sent') {
    return 'bg-blue-600 text-white rounded-br-sm';
  } else {
    return 'bg-green-600 text-white rounded-bl-sm';
  }
};

// Message time styling
const getMessageTimeStyle = (messageType) => {
  if (messageType === 'sent') {
    return 'text-blue-100 text-right';
  } else {
    return 'text-green-100';
  }
};

  return (
    <div className="h-full flex overflow-hidden">
      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-95" onClick={() => setShowImageModal(false)}>
          <div className="relative w-[95%] h-[95%] flex items-center justify-center">
            <img 
              src={modalImageUrl}
              alt={modalImageName}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 bg-black bg-opacity-60 text-white p-3 rounded-full hover:bg-opacity-80 transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-60 text-white p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm truncate">{modalImageName}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(modalImageUrl, modalImageName);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Call Interface Overlay */}
      {callStatus && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-800'} bg-opacity-95 text-white p-6`}>
          <div className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl">
            <div className="w-full h-64 md:h-96 bg-gray-700 rounded-lg mb-6 flex items-center justify-center relative overflow-hidden">
              {callStatus === 'calling' ? (
                <div className="text-center">
                  <div className="text-2xl font-semibold mb-2">Calling {currentChat?.name}...</div>
                  <div className="text-lg text-gray-300">Please wait for the doctor to answer</div>
                  <div className="mt-8 animate-pulse">
                    <div className="w-24 h-24 mx-auto rounded-full bg-gray-600 flex items-center justify-center">
                      {callType === 'video' ? (
                        <Video className="w-12 h-12" />
                      ) : (
                        <Phone className="w-12 h-12" />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-full h-full bg-gray-900"></div>
                  <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 rounded-lg p-2">
                    <div className="text-sm">{currentChat?.name}</div>
                  </div>
                </>
              )}
            </div>
            
            {callType === 'video' && callStatus === 'in-progress' && (
              <div className="w-32 h-24 bg-gray-900 rounded-lg absolute bottom-24 right-6 border-2 border-white">
                <div className="w-full h-full bg-gray-800"></div>
              </div>
            )}
            
            <div className="flex gap-6 mt-8">
              <button 
                onClick={endCall}
                className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700 transition-colors"
              >
                <Phone className="w-8 h-8 transform rotate-135" />
              </button>
              
              {callType === 'audio' && callStatus === 'in-progress' && (
                <button className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center hover:bg-gray-700 transition-colors">
                  <Mic className="w-8 h-8" />
                </button>
              )}
            </div>
            
            <div className="mt-8 text-center">
              <div className="text-xl font-semibold">
                {callStatus === 'calling' ? 'Calling...' : '00:05:23'}
              </div>
              <div className="text-gray-400 mt-2">
                {callType === 'audio' ? 'Audio Call' : 'Video Call'} with {currentChat?.name}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Layout */}
      <div className="md:hidden w-full h-full">
        {!showChatRoom ? (
          // Mobile: Profiles List View
          <div className={`w-full h-full flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            {/* Header */}
            <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Messages</h2>
                <button onClick={openAddModal} className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'border-gray-200'
                  }`}
                />
              </div>
            </div>

            {/* Mobile Chat List */}
            <div className="flex-1 overflow-y-auto">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleProfileClick(chat.id)}
                  className={`p-4 border-b cursor-pointer transition-colors ${
                    selectedChat === chat.id
                      ? darkMode 
                        ? 'bg-gray-700 border-gray-600' 
                        : 'bg-blue-50 border-blue-200'
                      : darkMode 
                        ? 'hover:bg-gray-700 border-gray-700' 
                        : 'hover:bg-gray-50 border-gray-200'
                  }`}
                >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {chat.photoUrl ? (
                      <img src={chat.photoUrl} alt={chat.name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold bg-gradient-to-r from-blue-500 to-purple-500">
                        {chat.avatar}
                      </div>
                    )}
                    {chat.online && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {chat.name}
                        </h3>
                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {chat.time}
                        </span>
                      </div>
                    <p className={`text-sm truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{chat.lastMessage}</p>
                      <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{chat.role}</span>
                        {chat.unread > 0 && (
                          <div className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {chat.unread}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Fallback empty state for mobile chat list */}
              {filteredChats.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  No conversations found.
                </div>
              )}
            </div>
          </div>
        ) : (
          // Mobile: Chat Room View
          <div className={`w-full h-full flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'} relative`}>
            {/* Mobile Chat Header - Fixed at top */}
            <div className={`fixed top-0 left-0 right-0 z-10 p-4 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} flex items-center gap-3`}>
              <button
                onClick={handleBackToList}
                className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </button>
              <div className="flex items-center gap-3 flex-1">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                    currentChat?.id === 'dr-smith' ? 'bg-gradient-to-r from-blue-500 to-purple-500' :
                    currentChat?.id === 'dr-johnson' ? 'bg-gradient-to-r from-green-500 to-teal-500' :
                    currentChat?.id === 'dr-wilson' ? 'bg-gradient-to-r from-pink-500 to-rose-500' :
                    'bg-gradient-to-r from-orange-500 to-yellow-500'
                  }`}>
                    {currentChat?.avatar}
                  </div>
                  {currentChat?.online && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {currentChat?.name}
                  </h3>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <span className={`inline-flex items-center gap-1`}>
                      <div className={`w-2 h-2 rounded-full ${currentChat?.online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      {currentChat?.online ? 'Online' : currentChat?.lastSeen ? `Last seen ${new Date(currentChat.lastSeen).toLocaleString()}` : 'Offline'}
                    </span>
                    {currentChat?.role && ` • ${currentChat.role}`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => startCall('audio')}
                  className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}
                  title="Audio Call"
                >
                  <Phone className="w-4 h-4 text-blue-500" />
                </button>
                <button 
                  onClick={() => startCall('video')}
                  className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}
                  title="Video Call"
                >
                  <Video className="w-4 h-4 text-blue-500" />
                </button>
              </div>
            </div>

            {/* Messages Container - Scrollable middle section */}
            <div ref={messagesContainerRef} className="pt-20 pb-24 px-4 space-y-3 overflow-y-auto flex-1">
              {/* Loading indicator for older messages */}
              {isLoadingOlderMessages && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              )}
              {messages.map((message) => (
                <div key={message.id} className={`flex ${getMessageAlignment(message.type)}`}>
                  <div className={`max-w-[80%] md:max-w-[65%] ${message.files && message.files.length > 0 ? 'p-0' : 'px-4 py-2'} rounded-2xl ${
                    getMessageBubbleStyle(message.type, darkMode)
                  }`}>
                    {/* Media files display */}
                    {message.files && message.files.length > 0 && (
                      <div className="space-y-1">
                        {message.files.map((file, index) => (
                          <div key={index}>
                            {file.type === 'image' ? (
                              <div className="relative group">
                                <img 
                                  src={file.url ? `${API_BASE_URL}${file.url}` : '#'}
                                  alt={file.name}
                                  className="w-full max-w-sm rounded-2xl cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => handleImageClick(`${API_BASE_URL}${file.url}`, file.name)}
                                  onLoad={() => console.log('Image loaded successfully:', file.url)}
                                  onError={(e) => {
                                    console.error('Image load error for URL:', `${API_BASE_URL}${file.url}`);
                                    console.error('Error details:', e);
                                    // Show fallback instead of hiding
                                    e.target.style.display = 'none';
                                    const fallback = document.createElement('div');
                                    fallback.className = 'w-full max-w-sm rounded-2xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center p-8 text-gray-500';
                                    fallback.innerHTML = `
                                      <div class="text-center">
                                        <div class="text-4xl mb-2">📷</div>
                                        <div class="text-sm">Image not loading</div>
                                        <div class="text-xs mt-1">${file.name}</div>
                                      </div>
                                    `;
                                    e.target.parentNode.appendChild(fallback);
                                  }}
                                />
                                {/* Timestamp overlay in corner */}
                                <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded-lg text-xs">
                                  {message.time}
                                </div>
                                {/* Download button overlay */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownload(`${API_BASE_URL}${file.url}`, file.name);
                                    }}
                                    className="bg-black bg-opacity-60 text-white p-2 rounded-full hover:bg-opacity-80 transition-colors"
                                    title="Download image"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className={`p-3 ${message.type === 'sent' ? 'bg-blue-500/20' : 'bg-green-500/20'} rounded-2xl`}>
                                <div className="flex items-center gap-3">
                                  {renderFileIcon(file.type)}
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{file.name}</div>
                                    {file.size && <div className="text-xs opacity-70">{file.size}</div>}
                                  </div>
                                  <a 
                                    href={file.url ? `${API_BASE_URL}${file.url}` : '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Text message */}
                    {message.message && (
                      <div className={`px-4 py-2 ${message.files && message.files.length > 0 ? 'pt-2' : ''}`}>
                        <p className="text-sm leading-relaxed break-words">{message.message}</p>
                      </div>
                    )}
                    
                    {/* Message time - only show for non-image messages */}
                    {!(message.files && message.files.some(file => file.type === 'image')) && (
                      <div className={`text-[10px] px-4 pb-2 ${getMessageTimeStyle(message.type)}`}>{message.time}</div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Mobile Message Input - Fixed at bottom */}
            <div className={`fixed bottom-0 left-0 right-0 z-10 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              {/* Selected file preview */}
              {selectedFile && (
                <div className={`mx-4 mb-2 p-2 rounded-lg flex items-center justify-between ${
                  darkMode ? 'bg-gray-700' : 'bg-blue-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-gray-500" />
                    <span className="text-sm truncate max-w-xs">{selectedFile.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button 
                    onClick={removeSelectedFile}
                    className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                {/* Screenshot processing indicator */}
                {isProcessingScreenshot && (
                  <div className={`mb-2 p-2 rounded-lg ${darkMode ? 'bg-blue-900/50' : 'bg-blue-50'} flex items-center gap-2`}>
                    <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <span className="text-sm text-blue-600 dark:text-blue-400">Processing screenshot...</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => {
                        console.log('Emoji picker button clicked, current state:', showEmojiPicker);
                        setShowEmojiPicker(!showEmojiPicker);
                      }}
                      className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
                    >
                      <Smile className="w-5 h-5 text-gray-500" />
                    </button>
                    
                    {showEmojiPicker && (
                      <div className="absolute bottom-full left-0 mb-2 z-20 emoji-picker-container">
                        <EmojiPicker
                          onEmojiClick={handleEmojiClick}
                          theme={darkMode ? 'dark' : 'light'}
                          width={280}
                          height={350}
                          emojiAsFile={emojiAsFile}
                          setEmojiAsFile={setEmojiAsFile}
                          onClose={() => setShowEmojiPicker(false)}
                        />
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
                  >
                    <Paperclip className="w-5 h-5 text-gray-500" />
                  </button>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className={`flex-1 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'border-gray-200'
                    }`}
                    onKeyPress={handleKeyPress}
                    onPaste={handlePaste}
                    onFocus={loadLatestMessagesOnFocus} // Reload latest messages on focus
                  />
                  
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() && !selectedFile}
                    className={`p-2 rounded-xl transition-colors ${
                      (!newMessage.trim() && !selectedFile) 
                        ? 'bg-gray-300 text-gray-500 dark:bg-gray-600' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal: Doctor List Only */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col`}>
            <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Start a Chat</h3>
              <button onClick={closeAddModal} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} p-2 rounded-lg`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-6">
              {/* Doctors */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`${darkMode ? 'text-white' : 'text-gray-800'} font-semibold`}>Doctors</h4>
                  <div className="relative w-64">
                    <Search className={`absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <input
                      type="text"
                      value={addSearch}
                      onChange={(e) => setAddSearch(e.target.value)}
                      placeholder="Search doctors..."
                      className={`w-full pl-8 pr-3 py-1.5 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-200'}`}
                    />
                  </div>
                </div>
                {loadingDoctors ? (
                  <div className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading doctors...</div>
                ) : filteredDoctorsForAdd.length > 0 ? (
                  <div className="grid gap-2">
                    {filteredDoctorsForAdd.map((d) => (
                      <div key={d.id} className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div onClick={() => startChatWith({ id: d.id, first_name: d.first_name, last_name: d.last_name, username: d.specialization })} className="cursor-pointer select-none">
                          <div className={`${darkMode ? 'text-white' : 'text-gray-800'} font-medium`}>Dr. {d.first_name} {d.last_name}</div>
                          <div className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-sm`}>{d.specialization}</div>
                        </div>
                        <button onClick={() => startChatWith({ id: d.id, first_name: d.first_name, last_name: d.last_name, username: d.specialization })} className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm">Chat</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No doctors found.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop: Original Layout */}
      <div className="hidden md:flex w-full h-full">
        {/* Chat Users List */}
          <div className={`w-80 border-r ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} flex flex-col h-full`}>
          {/* Header */}
            <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Messages</h2>
              <button onClick={openAddModal} className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'border-gray-200'
                }`}
              />
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat.id)}
                className={`p-4 border-b cursor-pointer transition-colors ${
                  selectedChat === chat.id
                    ? darkMode 
                      ? 'bg-gray-700 border-gray-600' 
                      : 'bg-blue-50 border-blue-200'
                    : darkMode 
                      ? 'border-gray-700 hover:bg-gray-700' 
                      : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {chat.photoUrl ? (
                      <img src={chat.photoUrl} alt={chat.name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-r from-blue-500 to-purple-500">
                        {chat.avatar}
                      </div>
                    )}
                    {chat.online && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-800'} truncate`}>
                        {chat.name}
                      </h3>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{chat.time}</span>
                    </div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} truncate`}>{chat.role}</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} truncate mt-1`}>{chat.lastMessage}</p>
                  </div>
                  
                  {chat.unread > 0 && (
                    <div className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {chat.unread}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {currentChat ? (
            <>
              {/* Chat Header */}
              <div className={`p-4 border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} flex-shrink-0`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      currentChat.id === 'dr-smith' ? 'bg-gradient-to-r from-blue-500 to-purple-500' :
                      currentChat.id === 'dr-johnson' ? 'bg-gradient-to-r from-green-500 to-teal-500' :
                      currentChat.id === 'dr-wilson' ? 'bg-gradient-to-r from-pink-500 to-rose-500' :
                      'bg-gradient-to-r from-orange-500 to-yellow-500'
                    }`}>
                      {currentChat.avatar}
                    </div>
                    <div>
                      <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {currentChat.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${currentChat.online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {currentChat.online ? 'Online' : currentChat.lastSeen ? `Last seen ${new Date(currentChat.lastSeen).toLocaleString()}` : 'Offline'}
                          {currentChat.role && ` • ${currentChat.role}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => startCall('audio')}
                      className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}
                      title="Audio Call"
                    >
                      <Phone className="w-5 h-5 text-blue-500" />
                    </button>
                    <button 
                      onClick={() => startCall('video')}
                      className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}
                      title="Video Call"
                    >
                      <Video className="w-5 h-5 text-blue-500" />
                    </button>
                    <button className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}>
                      <MoreHorizontal className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div ref={messagesContainerRef} className="flex-1 p-4 space-y-3 overflow-y-auto min-h-0 pb-4">
                {/* Loading indicator for older messages */}
                {isLoadingOlderMessages && (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${getMessageAlignment(message.type)}`}>
                    <div className={`max-w-md lg:max-w-2xl ${message.files && message.files.length > 0 ? 'p-0' : 'px-4 py-2'} rounded-2xl ${
                      getMessageBubbleStyle(message.type, darkMode)
                    }`}>
                      {/* Media files display */}
                      {message.files && message.files.length > 0 && (
                        <div className="space-y-1">
                          {message.files.map((file, index) => (
                            <div key={index}>
                              {file.type === 'image' ? (
                                <div className="relative group">
                                  <img 
                                    src={file.url ? `${API_BASE_URL}${file.url}` : '#'}
                                  alt={file.name}
                                  className="w-full max-w-md rounded-2xl cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => handleImageClick(`${API_BASE_URL}${file.url}`, file.name)}
                                  onLoad={() => console.log('Image loaded successfully:', file.url)}
                                  onError={(e) => {
                                    console.error('Image load error for URL:', `${API_BASE_URL}${file.url}`);
                                      console.error('Error details:', e);
                                      // Show fallback instead of hiding
                                      e.target.style.display = 'none';
                                      const fallback = document.createElement('div');
                                      fallback.className = 'w-full max-w-md rounded-2xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center p-8 text-gray-500';
                                      fallback.innerHTML = `
                                        <div class="text-center">
                                          <div class="text-4xl mb-2">📷</div>
                                          <div class="text-sm">Image not loading</div>
                                          <div class="text-xs mt-1">${file.name}</div>
                                        </div>
                                      `;
                                      e.target.parentNode.appendChild(fallback);
                                    }}
                                  />
                                  {/* Timestamp overlay in corner */}
                                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded-lg text-xs">
                                    {message.time}
                                  </div>
                                  {/* Download button overlay */}
                                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownload(`${API_BASE_URL}${file.url}`, file.name);
                                      }}
                                      className="bg-black bg-opacity-60 text-white p-2 rounded-full hover:bg-opacity-80 transition-colors"
                                      title="Download image"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className={`p-3 ${message.type === 'sent' ? 'bg-blue-500/20' : 'bg-green-500/20'} rounded-2xl`}>
                                  <div className="flex items-center gap-3">
                                    {renderFileIcon(file.type)}
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium truncate">{file.name}</div>
                                      {file.size && <div className="text-xs opacity-70">{file.size}</div>}
                                    </div>
                                    <a 
                                      href={file.url ? `${API_BASE_URL}${file.url}` : '#'}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Text message */}
                      {message.message && (
                        <div className={`px-4 py-2 ${message.files && message.files.length > 0 ? 'pt-2' : ''}`}>
                          <p className="text-sm leading-relaxed break-words">{message.message}</p>
                        </div>
                      )}
                      
                      {/* Message time - only show for non-image messages */}
                      {!(message.files && message.files.some(file => file.type === 'image')) && (
                        <div className={`text-[10px] px-4 pb-2 ${getMessageTimeStyle(message.type)}`}>{message.time}</div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Selected file preview */}
              {selectedFile && (
                <div className={`mx-4 mb-2 p-2 rounded-lg flex items-center justify-between flex-shrink-0 ${
                  darkMode ? 'bg-gray-700' : 'bg-blue-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-gray-500" />
                    <span className="text-sm truncate max-w-xs">{selectedFile.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button 
                    onClick={removeSelectedFile}
                    className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Message Input */}
              <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
                {/* Screenshot processing indicator */}
                {isProcessingScreenshot && (
                  <div className={`mb-2 p-2 rounded-lg ${darkMode ? 'bg-blue-900/50' : 'bg-blue-50'} flex items-center gap-2`}>
                    <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <span className="text-sm text-blue-600 dark:text-blue-400">Processing screenshot...</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => {
                        console.log('Desktop emoji picker button clicked, current state:', showEmojiPicker);
                        setShowEmojiPicker(!showEmojiPicker);
                      }}
                      className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} transition-colors`}
                    >
                      <Smile className="w-5 h-5 text-gray-500" />
                    </button>
                    
                    {showEmojiPicker && (
                      <div className="absolute bottom-full left-0 mb-2 z-10 emoji-picker-container">
                        <EmojiPicker 
                          onEmojiClick={handleEmojiClick}
                          theme={darkMode ? 'dark' : 'light'}
                          height={350}
                          width={300}
                          emojiAsFile={emojiAsFile}
                          setEmojiAsFile={setEmojiAsFile}
                          onClose={() => setShowEmojiPicker(false)}
                        />
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} transition-colors`}
                  >
                    <Paperclip className="w-5 h-5 text-gray-500" />
                  </button>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className={`flex-1 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'border-gray-200'
                    }`}
                    onKeyPress={handleKeyPress}
                    onPaste={handlePaste}
                    onFocus={loadLatestMessagesOnFocus} // Reload latest messages on focus
                  />
                  
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() && !selectedFile}
                    className={`p-2 rounded-xl transition-colors ${
                      (!newMessage.trim() && !selectedFile) 
                        ? 'bg-gray-300 text-gray-500 dark:bg-gray-600' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center min-h-0">
              <div className="text-center">
                <div className={`text-6xl mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>💬</div>
                <h3 className={`text-xl font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Select a conversation to start chatting
                </h3>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatTab;