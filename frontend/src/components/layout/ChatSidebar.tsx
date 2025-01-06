import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Loader2, Send, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean; // Add this property
}
export const ChatSidebar = ({ isOpen, onClose }: ChatSidebarProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    const newUserMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post('/chat', {
        messages: [...messages, newUserMessage],
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      // Initialize an empty message for the assistant
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();

      try {
        while (true) {
          const { value, done } = await reader.read();
          
          if (done) break;
          
          // Split the chunk into lines and process each line
          const lines = value.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(5).trim();
              
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                
                if ('content' in parsed) {
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage.role === 'assistant') {
                      // Simply replace the content instead of appending
                      newMessages[newMessages.length - 1] = {
                        ...lastMessage,
                        content: parsed.content
                      };
                    }
                    return newMessages;
                  });
                }
              } catch (e) {
                console.error('Error parsing chunk:', e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, there was an error processing your request.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleClearConversation = () => {
    setMessages([]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <aside
      className={cn(
        "fixed top-0 right-0 z-50 h-screen w-72 flex-shrink-0 flex flex-col bg-gray-50 transition-transform duration-300 dark:bg-gray-900/50",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Chat with notes</span>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleClearConversation}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "max-w-[85%] rounded-lg p-3 text-sm",
                message.role === 'user' 
                  ? "bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 ml-auto border border-gray-100 dark:border-gray-700" 
                  : "bg-primary text-primary-foreground"
              )}
            >
              <p className="whitespace-pre-wrap leading-relaxed">
                {message.content}
              </p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your notes..."
            rows={1}
            disabled={isLoading}
            className={cn(
              "flex-1 min-h-[40px] max-h-[120px] px-3 py-2 text-sm rounded-md resize-none",
              "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
              "disabled:opacity-50 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            )}
          />
          <Button 
            size="icon" 
            onClick={handleSend}
            disabled={input.trim() === '' || isLoading}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
};