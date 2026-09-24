"use client";

import { useState, useEffect, useRef } from "react";

const agents = [
  { id: "itinerary", name: "Itinerary", icon: "🗺️", endpoint: "/generate-itinerary" },
  { id: "activities", name: "Activities", icon: "🎯", endpoint: "/agent/activities" },
  { id: "weather", name: "Weather", icon: "🌤️", endpoint: "/agent/weather" },
  { id: "packing", name: "Packing", icon: "🎒", endpoint: "/agent/packing" },
  { id: "food", name: "Food & Culture", icon: "🍽️", endpoint: "/agent/food-culture" },
  { id: "links", name: "Resources", icon: "🔗", endpoint: "/agent/links" },
];

export default function Home() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<any>({});
  const [activeTab, setActiveTab] = useState("itinerary");
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [userQuestion, setUserQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    origin: "Mumbai",
    destination: "",
    month: "May",
    duration: 7,
    num_people: "2",
    holiday_type: "Any",
    budget_type: "Mid-Range",
    comments: "",
  });

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const runMainItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading({ itinerary: true });
    setData({}); // Reset data
    setChatHistory([]); // Reset chat
    try {
      const response = await fetch("http://localhost:8000/generate-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const resData = await response.json();
      // Filter out null values from resData before merging
      const filteredData = Object.fromEntries(
        Object.entries(resData).filter(([_, v]) => v !== null)
      );
      setData((prev: any) => ({ ...prev, ...filteredData, preferences: formData }));
      setActiveTab("itinerary");
    } catch (error) {
      console.error("Failed to generate itinerary", error);
    } finally {
      setLoading({ itinerary: false });
    }
  };

  const runAgent = async (agentId: string, endpoint: string) => {
    if (loading[agentId]) return;
    setLoading((prev: any) => ({ ...prev, [agentId]: true }));
    try {
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: formData,
          itinerary: data.itinerary,
          ...data
        }),
      });
      const resData = await response.json();
      // Filter out null values from resData before merging
      const filteredData = Object.fromEntries(
        Object.entries(resData).filter(([_, v]) => v !== null)
      );
      setData((prev: any) => ({ ...prev, ...filteredData }));
      setActiveTab(agentId);
    } catch (error) {
      console.error(`Failed to run agent ${agentId}`, error);
    } finally {
      setLoading((prev: any) => ({ ...prev, [agentId]: false }));
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim() || chatLoading) return;

    const currentQuestion = userQuestion;
    setUserQuestion("");
    setChatLoading(true);

    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_question: currentQuestion,
          context: { preferences: formData, itinerary: data.itinerary },
          chat_history: chatHistory
        }),
      });
      const resData = await response.json();
      setChatHistory(resData.updated_history);
    } catch (error) {
      console.error("Chat failed", error);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 selection:bg-indigo-500/30">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/5 px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-cyan-400 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/20">✈️</div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              AI Travel Planner
            </h1>
          </div>
          <div className="text-sm font-medium text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Agents Online
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 lg:p-10 grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Left Column: Form */}
        <div className="xl:col-span-4 space-y-8">
          <section className="bg-slate-900/50 rounded-3xl p-8 border border-white/5 backdrop-blur-sm shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-cyan-400"></div>
            <h2 className="text-2xl font-bold mb-8 text-white">Create Your Escape</h2>

            <form onSubmit={runMainItinerary} className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-400">Where are you starting from?</label>
                  <input
                    type="text"
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-600"
                    placeholder="e.g. Mumbai"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-400">Where do you want to go?</label>
                  <input
                    type="text"
                    required
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-600"
                    placeholder="e.g. Paris"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-400">Month</label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none cursor-pointer"
                  >
                    {[
                      "January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"
                    ].map(m => <option key={m} className="bg-slate-900" value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-400">Duration (Days)</label>
                  <input
                    type="number"
                    min="1" max="30"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-500/50 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-400">Number of People</label>
                  <select
                    value={formData.num_people}
                    onChange={(e) => setFormData({ ...formData, num_people: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none cursor-pointer"
                  >
                    {["1", "2", "3", "4-6", "7-10", "10+"].map(num => (
                      <option key={num} className="bg-slate-900" value={num}>{num}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-400">Budget</label>
                  <select
                    value={formData.budget_type}
                    onChange={(e) => setFormData({ ...formData, budget_type: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none cursor-pointer"
                  >
                    {["Budget", "Mid-Range", "Luxury"].map(b => (
                      <option key={b} className="bg-slate-900" value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-400">Style</label>
                  <select
                    value={formData.holiday_type}
                    onChange={(e) => setFormData({ ...formData, holiday_type: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none cursor-pointer"
                  >
                    {["Any", "Adventure", "Romantic", "Family", "Beach", "Backpacking"].map(t => (
                      <option key={t} className="bg-slate-900" value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-400">Comments</label>
                  <input
                    type="text"
                    value={formData.comments}
                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-600"
                    placeholder="e.g. food lover, history"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading.itinerary}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-2"
              >
                {loading.itinerary ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>✨ Generate Itinerary</>
                )}
              </button>
            </form>
          </section>

          {/* Chat Assistant (Always visible on large screens) */}
          <section className="bg-slate-900/50 rounded-3xl p-6 border border-white/5 backdrop-blur-sm shadow-2xl flex flex-col h-[400px]">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-sm">🤖</span>
              Trip Assistant
            </h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {chatHistory.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-sm">
                  Ask me anything about your trip!
                </div>
              )}
              {chatHistory.map((chat, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-end">
                    <div className="bg-indigo-600/20 text-indigo-100 px-4 py-2 rounded-2xl rounded-tr-sm text-sm border border-indigo-500/20 max-w-[85%]">
                      {chat.question}
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-slate-800/80 text-slate-200 px-4 py-2 rounded-2xl rounded-tl-sm text-sm border border-white/5 max-w-[85%]">
                      {chat.response}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleChat} className="mt-4 relative">
              <input
                type="text"
                disabled={!data.itinerary || chatLoading}
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                placeholder={data.itinerary ? "Ask a question..." : "Generate an itinerary first"}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none pr-12 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!userQuestion.trim() || chatLoading}
                className="absolute right-2 top-2 h-9 w-9 bg-indigo-500 rounded-lg flex items-center justify-center disabled:opacity-50 active:scale-90 transition-all"
              >
                {chatLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "📤"}
              </button>
            </form>
          </section>
        </div>

        {/* Right Column: Display area */}
        <div className="xl:col-span-8 flex flex-col">
          {!data.itinerary && !loading.itinerary ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-900/30 rounded-3xl border-2 border-dashed border-white/5 space-y-6">
              <div className="w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center text-5xl grayscale opacity-50">🌍</div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Your adventure starts here</h3>
                <p className="text-slate-500 max-w-md">Fill out the form and our AI agents will craft a personalized travel experience just for you.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Agent Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => agent.id === "itinerary" ? setActiveTab("itinerary") : runAgent(agent.id, agent.endpoint)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all whitespace-nowrap border ${activeTab === agent.id
                      ? "bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/20"
                      : "bg-slate-900/50 text-slate-400 border-white/5 hover:bg-slate-800 hover:text-slate-200"
                      } ${loading[agent.id] ? "animate-pulse" : ""}`}
                  >
                    <span>{agent.icon}</span>
                    {agent.name}
                    {loading[agent.id] && (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    )}
                  </button>
                ))}
              </div>

              {/* Content Card */}
              <div className="flex-1 bg-slate-900/50 rounded-3xl p-8 lg:p-10 border border-white/5 shadow-2xl overflow-y-auto">
                {loading[activeTab] ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-6 py-20">
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl animate-bounce">✨</div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-medium text-white">Agent is thinking...</p>
                      <p className="text-sm text-slate-500">Researching real-time travel data for you.</p>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none">
                    <div className="flex justify-between items-start mb-6">
                      <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        {agents.find(a => a.id === activeTab)?.icon}
                        {agents.find(a => a.id === activeTab)?.name}
                      </h2>
                      {activeTab === "itinerary" && (
                        <button className="bg-slate-800 hover:bg-slate-700 text-xs font-bold px-4 py-2 rounded-lg transition-colors border border-white/5">
                          📥 Export PDF
                        </button>
                      )}
                    </div>

                    <div className="text-slate-300 whitespace-pre-wrap leading-relaxed text-sm lg:text-base">
                      {activeTab === "itinerary" && data.itinerary}
                      {activeTab === "activities" && (data.activity_suggestions || "No suggestions yet. Click Activity Suggestion button above to generate.")}
                      {activeTab === "weather" && (data.weather_forecast || "No forecast yet. Click Weather button above to generate.")}
                      {activeTab === "packing" && (data.packing_list || "No list yet. Click Packing button above to generate.")}
                      {activeTab === "food" && (data.food_culture_info || "No info yet. Click Food & Culture button above to generate.")}
                      {activeTab === "links" && (
                        <div className="space-y-4">
                          {data.useful_links?.length > 0 ? (
                            data.useful_links.map((link: any, i: number) => (
                              <a
                                key={i}
                                href={link.link}
                                target="_blank"
                                className="block p-4 bg-slate-950/50 rounded-2xl border border-white/5 hover:border-indigo-500/50 transition-all group"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold text-slate-200">{link.title}</span>
                                  <span className="text-xl group-hover:translate-x-1 transition-transform">➡️</span>
                                </div>
                                <span className="text-xs text-indigo-400 mt-1 block truncate opacity-60">{link.link}</span>
                              </a>
                            ))
                          ) : "No resources fetched yet."}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="py-10 text-center text-slate-600 text-xs border-t border-white/5 mt-auto">
        &copy; 2026 AI Travel Designer | Powered by Multi-Agent Intelligence
      </footer>

      {/* Styles for scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
