import React, { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  X,
  Send,
  Search,
  Check,
  CheckCheck,
  ChevronLeft,
  Footprints,
  Smile,
  Zap,
} from "lucide-react";
import { ChatThread, ChatMessage } from "../types";

// WhatsApp-style message ticks indicator
function WhatsAppStatusTicks({ status }: { status?: "sent" | "delivered" | "read" }) {
  if (status === "read") {
    return (
      <span className="inline-flex items-center" title="Read">
        <CheckCheck className="w-3.5 h-3.5 text-[#34B7F1] stroke-[2.5]" />
      </span>
    );
  }
  if (status === "delivered") {
    return (
      <span className="inline-flex items-center" title="Delivered">
        <CheckCheck className="w-3.5 h-3.5 text-gray-400 stroke-[2]" />
      </span>
    );
  }
  // status === "sent"
  return (
    <span className="inline-flex items-center" title="Sent">
      <Check className="w-3.5 h-3.5 text-gray-400 stroke-[2]" />
    </span>
  );
}

// Complete WhatsApp Emoji Categories
const EMOJI_CATEGORIES = [
  {
    id: "smileys",
    name: "Smileys",
    icon: "😀",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥹", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍",
      "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩",
      "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭",
      "😮‍💨", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔",
      "🫣", "🫢", "🫡", "🤫", "🫠", "🤥", "😶", "😶‍🌫️", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮",
      "😲", "🥱", "😴", "🤤", "😪", "😵", "😵‍💫", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑",
      "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃"
    ],
  },
  {
    id: "people",
    name: "People",
    icon: "👋",
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "🫱", "🫲", "🫳", "🫴", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟",
      "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "🫵", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌",
      "🫶", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃",
      "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄", "👶", "🧒", "👦", "👧", "🧑", "👱", "👨",
      "🧔", "👩", "🧓", "👴", "👵", "🚶", "🚶‍♂️", "🚶‍♀️", "🏃", "🏃‍♂️", "🏃‍♀️", "💃", "🕺", "👫", "👭", "👬"
    ],
  },
  {
    id: "nature",
    name: "Nature",
    icon: "🐶",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵",
      "🐒", "🦍", "🦧", "🐕", "🐈", "🐎", "🦄", "🦓", "🦌", "🐂", "🐄", "🐖", "🐏", "🐑", "🐐", "🐪",
      "🐫", "🦙", "🦒", "🐘", "🦏", "🦛", "🐿️", "🦔", "🦇", "🦅", "🦆", "🦉", "🦚", "🦜", "🌱", "🌿",
      "☘️", "🍀", "🎍", "🪴", "🌴", "🌳", "🌲", "🍂", "🍁", "🍄", "🌾", "💐", "🌷", "🌹", "🌻", "🌼",
      "🌸", "🌺", "🌞", "🌝", "🌛", "🌜", "🌙", "⭐", "🌟", "✨", "⚡", "🔥", "🌈", "☀️", "🌤️", "⛅",
      "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️", "☃️", "⛄", "💨", "💧", "💦", "🌊"
    ],
  },
  {
    id: "food",
    name: "Food",
    icon: "🍎",
    emojis: [
      "🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥",
      "🥝", "🍅", "🥑", "🥦", "🥬", "🥒", "🌶️", "🌽", "🥕", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞",
      "🥖", "🥨", "🧀", "🥚", "🍳", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🌭", "🍔", "🍟", "🍕", "🥪",
      "🥙", "🌮", "🌯", "🥗", "🥘", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🍤", "🍙", "🍚", "🍦",
      "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍭", "🍮", "🍯", "☕", "🫖", "🍵",
      "🧃", "🥤", "🧋", "🍺", "🍻", "🥂", "🍷", "🥃", "🍸", "🍹", "🍾"
    ],
  },
  {
    id: "activity",
    name: "Activity",
    icon: "⚽",
    emojis: [
      "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🏓", "🏸", "🏒", "🏏", "⛳", "🏹",
      "🎣", "🥊", "🥋", "🎽", "🛹", "🛼", "🎿", "🏂", "🏋️", "🏋️‍♂️", "🏋️‍♀️", "🤸", "🤸‍♂️", "🤸‍♀️", "🧗",
      "🧗‍♂️", "🧗‍♀️", "🧘", "🧘‍♂️", "🧘‍♀️", "🚴", "🚴‍♂️", "🚴‍♀️", "🚵", "🚵‍♂️", "🚵‍♀️", "🏊", "🏊‍♂️", "🏊‍♀️",
      "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🎫", "🎭", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🎷",
      "🎺", "🎸", "🎯", "🎳", "🎮", "🎲", "🧩"
    ],
  },
  {
    id: "travel",
    name: "Travel",
    icon: "🚗",
    emojis: [
      "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🛴", "🚲",
      "🛵", "🏍️", "🛺", "🚨", "🚔", "🚘", "🚖", "🚄", "🚅", "🚈", "🚂", "🚆", "🚇", "🚊", "🚉", "✈️",
      "🛫", "🛬", "💺", "🛰️", "🚀", "🛸", "🚁", "🛶", "⛵", "🚤", "🛳️", "⛴️", "🚢", "⚓", "🛟", "⛽",
      "🚦", "🚥", "🗺️", "🗿", "🗽", "🗼", "🏰", "🏯", "🏟️", "🎡", "🎢", "🏖️", "🏝️", "🏜️", "🌋", "⛰️",
      "🏔️", "🏕️", "⛺", "🏠", "🏡", "🏢", "🏬", "🏥", "🏦", "🏨", "🏫", "🏛️", "⛪", "🕌", "🛕", "🕍"
    ],
  },
  {
    id: "objects",
    name: "Symbols",
    icon: "💡",
    emojis: [
      "💡", "🔦", "🕯️", "📱", "📲", "💻", "⌨️", "🖥️", "📷", "📸", "📹", "🎥", "📺", "📻", "🎙️", "⏰",
      "⏱️", "⏲️", "🕰️", "⏳", "📡", "🔋", "🔌", "💳", "💎", "⚖️", "🔧", "🔨", "🛠️", "⚙️", "🔒", "🔓",
      "🔑", "🗝️", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "💕", "💞", "💓",
      "💗", "💖", "💘", "💝", "💯", "💢", "💬", "🗨️", "🗯️", "💭", "💤", "🔔", "🔕", "📢", "🎵", "🎶",
      "✔️", "☑️", "✅", "❌", "➕", "➖", "💲", "🚩", "🏁"
    ],
  },
];

// Clean format helper for usernames (strips @, trims, replaces spaces with underscores)
export function formatCleanUsername(name: string): string {
  return (name || "").replace(/^@+/, "").trim().replace(/\s+/g, "_").toLowerCase();
}

// Initial Loop DM threads with usernames only (no @ or real names)
export const INITIAL_CHAT_THREADS: ChatThread[] = [
  {
    id: "thread-1",
    buddyName: "rohan_verma",
    buddyAvatar: "https://images.unsplash.com/photo-1543549790-8b5f4a028cfb?auto=format&fit=crop&w=300&q=80",
    status: "online",
    distanceStr: "",
    meetupTrailName: "",
    unreadCount: 2,
    lastMessage: "Hey, should we do 2 loops or 3 loops around the trail?",
    lastMessageTime: "10:42 AM",
    messages: [
      {
        id: "m-1",
        sender: "buddy",
        text: "Hey! Glad we connected! 🌿",
        time: "10:30 AM",
        status: "read",
      },
      {
        id: "m-2",
        sender: "me",
        text: "Yes! Super excited for tomorrow's 6:30 AM pace.",
        time: "10:32 AM",
        status: "read",
      },
      {
        id: "m-3",
        sender: "buddy",
        text: "Awesome, I'll be waiting near the North Gate entry. Look for a green jacket! 🧥",
        time: "10:35 AM",
        status: "read",
      },
      {
        id: "m-4",
        sender: "me",
        text: "Perfect, see you there! 🚶‍♂️",
        time: "10:38 AM",
        status: "read",
      },
      {
        id: "m-5",
        sender: "buddy",
        text: "Hey, should we do 2 loops or 3 loops around the trail?",
        time: "10:42 AM",
        status: "read",
      },
    ],
  },
  {
    id: "thread-2",
    buddyName: "ananya_m",
    buddyAvatar: "https://images.unsplash.com/photo-1484406566174-9da000fda645?auto=format&fit=crop&w=300&q=80",
    status: "online",
    distanceStr: "",
    meetupTrailName: "",
    unreadCount: 1,
    lastMessage: "Saturday morning 7:00 AM works great!",
    lastMessageTime: "Yesterday",
    messages: [
      {
        id: "m-201",
        sender: "me",
        text: "Hi Ananya, thanks for connecting on Loop! Loved your park route post.",
        time: "Yesterday 4:15 PM",
        status: "read",
      },
      {
        id: "m-202",
        sender: "buddy",
        text: "Hey there! Thanks! That section is so peaceful in the mornings. 🎋",
        time: "Yesterday 4:20 PM",
        status: "read",
      },
      {
        id: "m-203",
        sender: "buddy",
        text: "Saturday morning 7:00 AM works great!",
        time: "Yesterday 4:22 PM",
        status: "read",
      },
    ],
  },
  {
    id: "thread-3",
    buddyName: "vikram_seth",
    buddyAvatar: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?auto=format&fit=crop&w=300&q=80",
    status: "offline",
    distanceStr: "",
    meetupTrailName: "",
    unreadCount: 0,
    lastMessage: "Dropped 100m interval reps along the perimeter!",
    lastMessageTime: "Jul 21",
    messages: [
      {
        id: "m-301",
        sender: "buddy",
        text: "Yo buddy! Nice connecting with you on WalkBuddy!",
        time: "Jul 21 8:10 AM",
        status: "read",
      },
      {
        id: "m-302",
        sender: "buddy",
        text: "Dropped 100m interval reps along the perimeter!",
        time: "Jul 21 8:12 AM",
        status: "read",
      },
      {
        id: "m-303",
        sender: "me",
        text: "Sounds super energizing! Count me in for interval reps.",
        time: "Jul 21 8:15 AM",
        status: "read",
      },
    ],
  },
  {
    id: "thread-4",
    buddyName: "karthik_r",
    buddyAvatar: "https://images.unsplash.com/photo-1564466809058-bf4114d55352?auto=format&fit=crop&w=300&q=80",
    status: "offline",
    distanceStr: "",
    meetupTrailName: "",
    unreadCount: 0,
    lastMessage: "Great power walk session today! Hit 7,200 steps together!",
    lastMessageTime: "Jul 19",
    messages: [
      {
        id: "m-401",
        sender: "buddy",
        text: "Great power walk session today! Hit 7,200 steps together!",
        time: "Jul 19 8:30 PM",
        status: "read",
      },
      {
        id: "m-402",
        sender: "me",
        text: "Indeed! That 5.8 km/h pace felt amazing. Catch you on the next walk!",
        time: "Jul 19 8:32 PM",
        status: "read",
      },
    ],
  },
  {
    id: "thread-5",
    buddyName: "divya_m",
    buddyAvatar: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=300&q=80",
    status: "online",
    distanceStr: "",
    meetupTrailName: "",
    unreadCount: 0,
    lastMessage: "Hi! Ready for tomorrow's morning jog near the park perimeter?",
    lastMessageTime: "Jul 18",
    messages: [
      {
        id: "m-501",
        sender: "buddy",
        text: "Hi! Ready for tomorrow's morning jog near the park perimeter?",
        time: "Jul 18 6:00 PM",
        status: "read",
      },
    ],
  },
];

interface BuddyChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatThreads: ChatThread[];
  onUpdateThreads: (updatedThreads: ChatThread[] | ((prev: ChatThread[]) => ChatThread[])) => void;
}

export default function BuddyChatModal({
  isOpen,
  onClose,
  chatThreads,
  onUpdateThreads,
}: BuddyChatModalProps) {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "active" | "invites">("all");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState("smileys");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeThread = chatThreads.find((t) => t.id === selectedThreadId);

  // Always reset to general chat list when modal is opened/closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedThreadId(null);
      setShowEmojiPicker(false);
    }
  }, [isOpen]);

  const handleCloseModal = () => {
    setSelectedThreadId(null);
    setShowEmojiPicker(false);
    onClose();
  };

  // Auto scroll to bottom of active chat
  useEffect(() => {
    if (activeThread) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeThread?.messages]);

  if (!isOpen) return null;

  // Filter threads by query & category tab
  const filteredThreads = chatThreads.filter((t) => {
    const matchesSearch =
      t.buddyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterCategory === "active") return t.status.includes("online") || t.status.includes("Walking");
    if (filterCategory === "invites") return t.unreadCount > 0;
    return true;
  });

  // Handle selecting a thread
  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);

    onUpdateThreads((prev) =>
      prev.map((t) => {
        if (t.id !== threadId) return t;
        return {
          ...t,
          unreadCount: 0,
          messages: t.messages.map((m) => ({ ...m, status: "read" as const })),
        };
      })
    );
  };

  // Handle sending a user message with progressive WhatsApp ticks (sent -> delivered -> read)
  const handleSendMessage = (textToSend?: string) => {
    const finalMsg = textToSend || inputText;
    if (!finalMsg.trim() || !activeThread) return;

    const threadId = activeThread.id;
    const msgId = `m-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: msgId,
      sender: "me",
      text: finalMsg.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "sent",
    };

    onUpdateThreads((prev) =>
      prev.map((t) => {
        if (t.id !== threadId) return t;
        return {
          ...t,
          lastMessage: finalMsg.trim(),
          lastMessageTime: "Just now",
          messages: [...t.messages, newMsg],
        };
      })
    );
    setInputText("");
    setShowEmojiPicker(false);

    // Realistic WhatsApp tick progression:
    // 1.2s -> Delivered (double gray tick)
    setTimeout(() => {
      onUpdateThreads((prev) =>
        prev.map((t) => {
          if (t.id !== threadId) return t;
          return {
            ...t,
            messages: t.messages.map((m) =>
              m.id === msgId && m.status === "sent" ? { ...m, status: "delivered" as const } : m
            ),
          };
        })
      );
    }, 1200);

    // 2.8s -> Read (double blue tick)
    setTimeout(() => {
      onUpdateThreads((prev) =>
        prev.map((t) => {
          if (t.id !== threadId) return t;
          return {
            ...t,
            messages: t.messages.map((m) =>
              m.id === msgId ? { ...m, status: "read" as const } : m
            ),
          };
        })
      );
    }, 2800);
  };

  const handleQuickChip = (chipText: string) => {
    handleSendMessage(chipText);
  };

  const currentCategoryObj =
    EMOJI_CATEGORIES.find((c) => c.id === activeEmojiCategory) || EMOJI_CATEGORIES[0];

  return (
    <div className="fixed inset-0 z-[1200] bg-black/40 flex items-center justify-center p-3 sm:p-5 md:p-8 animate-fadeIn select-none">
      {/* Container */}
      <div className="w-full max-w-3xl h-[88vh] max-h-[760px] bg-[var(--wb-surface)] text-[var(--wb-text)] border border-[var(--wb-line)] rounded-lg shadow-xl flex flex-col overflow-hidden font-sans relative">

        {/* ================= HEADER ================= */}
        <div className="p-4 bg-[var(--wb-card)] border-b border-[var(--wb-line)] flex items-center justify-between shrink-0">
          {activeThread ? (
            /* Active Person's Chat Header - Username Only */
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={() => setSelectedThreadId(null)}
                className="p-1.5 rounded-md bg-[var(--wb-surface)] text-black hover:bg-black/5 border border-[var(--wb-line)] transition-all flex items-center gap-1 shrink-0 text-xs font-bold"
                title="Back to All Chats"
              >
                <ChevronLeft className="w-4 h-4 text-black" />
                <span className="hidden sm:inline">Chats</span>
              </button>

              <img
                src={activeThread.buddyAvatar}
                alt={activeThread.buddyName}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover border border-black/20 shrink-0"
              />

              <div className="min-w-0 flex-1">
                <h3 className="font-headline font-extrabold text-sm text-[var(--wb-text)] truncate">
                  {formatCleanUsername(activeThread.buddyName)}
                </h3>
                <p className="text-[10px] text-gray-500 flex items-center gap-1.5 font-mono">
                  <span
                    className={`w-2 h-2 rounded-full inline-block shrink-0 ${
                      activeThread.status === "online" || activeThread.status.includes("Walking")
                        ? "bg-emerald-500"
                        : "bg-gray-300"
                    }`}
                  />
                  <span className="capitalize">{activeThread.status === "online" ? "online" : "offline"}</span>
                </p>
              </div>
            </div>
          ) : (
            /* Chat History List Header - Simply 'Chat' */
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-black flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4 stroke-[2.5] text-white" />
              </div>
              <div>
                <h3 className="font-headline font-black text-base text-[var(--wb-text)] tracking-wide">
                  Chat
                </h3>
              </div>
            </div>
          )}

          {/* Close Modal Button */}
          <button
            onClick={handleCloseModal}
            className="p-2 rounded-md text-gray-500 hover:text-black hover:bg-black/5 transition-colors shrink-0 ml-2"
            title="Close Chat"
          >
            <X className="w-4 h-4 text-black" />
          </button>
        </div>

        {/* ================= BODY CONTENT ================= */}
        {!activeThread ? (
          /* ================= VIEW 1: PEOPLE & CHATS LIST ================= */
          <div className="flex-1 flex flex-col min-h-0 bg-[var(--wb-surface)]">
            {/* Search & Filter Bar */}
            <div className="p-3.5 bg-[var(--wb-card)] border-b border-[var(--wb-line)] space-y-2.5">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-black absolute left-3" />
                <input
                  type="text"
                  placeholder="Search by username or message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--wb-surface)] text-xs text-[var(--wb-text)] placeholder-gray-400 pl-9 pr-3 py-2.5 rounded-md border border-[var(--wb-line)] focus:outline-none focus:border-black"
                />
              </div>

              {/* Category Filters */}
              <div className="flex items-center gap-2">
                {[
                  { id: "all", label: `All Chats (${chatThreads.length})` },
                  { id: "active", label: "Online" },
                  { id: "invites", label: "Unread" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterCategory(tab.id as any)}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-headline font-bold uppercase transition-all ${
                      filterCategory === tab.id
                        ? "bg-black text-white"
                        : "bg-[var(--wb-surface)] text-gray-600 hover:text-black border border-[var(--wb-line)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chats List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[var(--wb-line)] p-1">
              {filteredThreads.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Footprints className="w-10 h-10 mx-auto mb-2 opacity-30 text-black" />
                  <p className="text-xs font-semibold">No chats found.</p>
                </div>
              ) : (
                filteredThreads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => handleSelectThread(thread.id)}
                    className="w-full p-4 flex items-center gap-3.5 hover:bg-black/5 transition-all text-left rounded-md group"
                  >
                    {/* Buddy Avatar */}
                    <div className="relative shrink-0">
                      <img
                        src={thread.buddyAvatar}
                        alt={thread.buddyName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-black/20 group-hover:border-black transition-colors"
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--wb-surface)] ${
                          thread.status === "online" || thread.status.includes("Walking")
                            ? "bg-emerald-500"
                            : "bg-gray-300"
                        }`}
                        title={thread.status}
                      />
                    </div>

                    {/* Thread Info - Username Only */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-headline font-bold text-sm text-[var(--wb-text)] truncate">
                          {formatCleanUsername(thread.buddyName)}
                        </h4>
                        <span className="text-[10px] text-gray-500 shrink-0 font-mono">
                          {thread.lastMessageTime}
                        </span>
                      </div>

                      {/* Last Message */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-600 truncate font-normal">
                          {thread.lastMessage}
                        </p>
                        {thread.unreadCount > 0 && (
                          <span className="bg-black text-white text-[10px] font-black min-w-4 h-4 px-1 rounded flex items-center justify-center shrink-0 leading-none">
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          /* ================= VIEW 2: INDIVIDUAL CHAT VIEW ================= */
          <div className="flex-1 flex flex-col min-h-0 bg-[var(--wb-surface)]">
            {/* Messages Wall */}
            <div
              className="flex-1 p-4 md:p-6 overflow-y-auto space-y-3.5 custom-scrollbar relative"
            >
              {/* Message Items */}
              {activeThread.messages.map((msg) => {
                const isMe = msg.sender === "me";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] p-3 rounded-md text-xs leading-relaxed relative ${
                        isMe
                          ? "bg-black text-white font-semibold border border-black"
                          : "bg-[var(--wb-card)] text-[var(--wb-text)] font-medium border border-[var(--wb-line)]"
                      }`}
                    >
                      {/* Message Text */}
                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {/* Time & WhatsApp Status Ticks */}
                      <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[9px] opacity-75 font-mono">
                        <span>{msg.time}</span>
                        {isMe && <WhatsAppStatusTicks status={msg.status} />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips (Without emojis or location sharing) */}
            <div className="px-3 py-2 bg-[var(--wb-card)] border-t border-[var(--wb-line)] flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[9px] text-gray-500 font-black uppercase shrink-0 flex items-center gap-1">
                <Zap className="w-3 h-3 text-black" />
                <span>Quick:</span>
              </span>
              {[
                "Meet 6:30 AM Tomorrow",
                "Ready for 5 km loop?",
                "Post-Walk Coffee?",
                "Ready to Start!",
                "Sounds good!",
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleQuickChip(chip)}
                  className="bg-[var(--wb-surface)] hover:bg-black/5 text-gray-700 border border-[var(--wb-line)] px-2.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap transition-all active:scale-95 shrink-0"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* WhatsApp Emoji Keyboard Picker Popover */}
            {showEmojiPicker && (
              <div className="bg-[var(--wb-card)] border-t border-[var(--wb-line)] flex flex-col h-56 animate-fadeIn">
                {/* Category Switcher Tabs */}
                <div className="flex items-center justify-around border-b border-[var(--wb-line)] px-2 py-1.5 shrink-0 bg-[var(--wb-surface)]">
                  {EMOJI_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveEmojiCategory(cat.id)}
                      className={`text-base p-1.5 rounded-md transition-transform ${
                        activeEmojiCategory === cat.id
                          ? "bg-black/10 scale-110"
                          : "opacity-60 hover:opacity-100 hover:scale-105"
                      }`}
                      title={cat.name}
                    >
                      {cat.icon}
                    </button>
                  ))}
                </div>

                {/* Emoji Grid */}
                <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
                  <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
                    {currentCategoryObj.name}
                  </div>
                  <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
                    {currentCategoryObj.emojis.map((emoji, idx) => (
                      <button
                        key={`${emoji}-${idx}`}
                        type="button"
                        onClick={() => setInputText((prev) => prev + emoji)}
                        className="text-xl p-1 rounded-md hover:bg-black/10 active:scale-125 transition-transform flex items-center justify-center"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Message Input Bar */}
            <div className="p-3 bg-[var(--wb-card)] border-t border-[var(--wb-line)] flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2 rounded-md transition-colors ${
                  showEmojiPicker ? "bg-black text-white" : "text-gray-600 hover:text-black hover:bg-black/5"
                }`}
                title="Emojis"
              >
                <Smile className="w-5 h-5" />
              </button>

              <input
                type="text"
                placeholder={`Message ${formatCleanUsername(activeThread.buddyName)}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSendMessage();
                  }
                }}
                className="flex-1 bg-[var(--wb-surface)] text-xs text-[var(--wb-text)] placeholder-gray-400 px-3.5 py-2.5 rounded-md border border-[var(--wb-line)] focus:outline-none focus:border-black"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim()}
                className={`w-9 h-9 rounded-md flex items-center justify-center transition-all ${
                  inputText.trim()
                    ? "bg-black"
                    : "bg-[var(--wb-surface)] border border-[var(--wb-line)]"
                }`}
              >
                <Send className={`w-4 h-4 ml-0.5 stroke-[2.5] ${inputText.trim() ? "text-white" : "text-black"}`} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}


