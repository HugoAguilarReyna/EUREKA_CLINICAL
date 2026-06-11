import { useState, useRef, useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { Send, User, Bot, Loader } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
}

export const KnowledgeCopilotPage = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'bot', content: 'Hello! I am your Knowledge Copilot. How can I assist you with your knowledge graph today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate POST /knowledge/copilot
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: `Here is a simulated response for your query: "${userMessage.content}". In a real environment, this would be an answer generated from the knowledge graph context.`
      };
      setMessages(prev => [...prev, botMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <PageContainer title="Knowledge Copilot">
      <div className="max-w-4xl mx-auto h-[calc(100vh-10rem)] flex flex-col glassmorphism rounded-xl overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`max-w-[80%] p-4 rounded-xl text-sm ${msg.role === 'user' ? 'bg-blue-600/20 text-blue-100 rounded-tr-none border border-blue-500/30' : 'bg-white/5 text-gray-200 rounded-tl-none border border-white/10'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-emerald-600">
                <Bot size={16} />
              </div>
              <div className="max-w-[80%] p-4 rounded-xl text-sm bg-white/5 text-gray-200 rounded-tl-none border border-white/10 flex items-center gap-2">
                <Loader size={16} className="animate-spin text-emerald-400" />
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 bg-black/20 border-t border-white/10">
          <div className="flex gap-2 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about the knowledge graph..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg flex items-center justify-center disabled:opacity-50 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
