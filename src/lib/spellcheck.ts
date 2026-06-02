// ============================================================
// StudyQuest AI — Spellcheck & Autocorrect Core Utility
// ============================================================

export interface CleanedWord {
  raw: string;
  base: string;
  leading: string;
  trailing: string;
  isCapitalized: boolean;
}

// ── Curated Common Vocabulary (~1,500 words) ──
const VOCABULARY_LIST = [
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
  "my", "your", "his", "its", "our", "their", "mine", "yours", "ours", "theirs",
  "this", "that", "these", "those", "who", "whom", "whose", "which", "what",
  "be", "is", "am", "are", "was", "were", "been", "being", "have", "has", "had",
  "do", "does", "did", "done", "doing", "go", "went", "gone", "going", "come",
  "came", "make", "made", "making", "take", "took", "taken", "taking", "get",
  "got", "gotten", "getting", "give", "gave", "given", "giving", "keep", "kept",
  "let", "lets", "will", "would", "shall", "should", "can", "could", "may",
  "might", "must", "say", "said", "saying", "think", "thought", "thinking",
  "know", "knew", "known", "knowing", "see", "saw", "seen", "seeing", "want",
  "look", "use", "used", "using", "find", "found", "tell", "told", "ask", "asked",
  "work", "worked", "working", "seem", "feel", "try", "leave", "call", "write",
  "wrote", "written", "writing", "read", "study", "studied", "studying", "learn",
  "learned", "learning", "teach", "taught", "understand", "solved", "solve",
  "good", "better", "best", "bad", "worse", "worst", "great", "small", "large",
  "big", "little", "long", "short", "high", "low", "new", "old", "young", "early",
  "late", "first", "last", "next", "own", "other", "same", "different", "difficult",
  "easy", "simple", "hard", "important", "necessary", "possible", "impossible",
  "correct", "wrong", "true", "false", "very", "really", "quite", "too", "also",
  "almost", "enough", "never", "always", "sometimes", "usually", "often", "seldom",
  "today", "yesterday", "tomorrow", "now", "then", "soon", "already", "still",
  "time", "year", "people", "way", "day", "man", "woman", "child", "government",
  "life", "world", "school", "state", "family", "student", "teacher", "class",
  "lesson", "book", "note", "notes", "scroll", "paper", "exam", "test", "quiz",
  "grade", "mark", "score", "studyquest", "quest", "dungeon", "alchemy", "potion",
  "ingredient", "timer", "clock", "hour", "minute", "second", "calendar", "schedule",
  "task", "tasks", "habit", "habits", "streak", "leaderboard", "points", "coins",
  "gold", "xp", "experience", "level", "achievement", "friend", "group", "chat",
  "message", "code", "editor", "project", "file", "folder", "resource", "link",
  "database", "query", "table", "sql", "dsa", "algorithm", "data", "structure",
  "system", "program", "software", "development", "web", "page", "site", "app",
  "application", "login", "password", "email", "profile", "avatar", "settings",
  "the", "a", "an", "and", "but", "or", "so", "because", "although", "though",
  "if", "unless", "while", "during", "until", "till", "before", "after", "since",
  "for", "to", "in", "on", "at", "by", "with", "about", "against", "between",
  "into", "through", "during", "without", "before", "after", "above", "below",
  "up", "down", "left", "right", "from", "of", "off", "out", "over", "under",
  "about", "above", "across", "action", "active", "activity", "add", "addition",
  "address", "admin", "adventurer", "advice", "agree", "air", "allow", "almost",
  "along", "already", "also", "always", "amount", "analysis", "animal", "another",
  "answer", "any", "anyone", "anything", "appear", "area", "arm", "around", "art",
  "article", "aside", "attack", "audio", "author", "auto", "autocorrect",
  "available", "average", "avoid", "award", "away", "baby", "back", "background",
  "balance", "bar", "base", "basic", "battle", "beautiful", "become", "bed",
  "begin", "beginning", "behavior", "behind", "believe", "below", "benefit",
  "best", "between", "beyond", "bill", "binary", "bird", "black", "blank", "block",
  "blood", "blue", "board", "body", "bomb", "bonus", "border", "boss", "both",
  "bottle", "bottom", "bounce", "box", "boy", "branch", "break", "breath", "breathe",
  "brew", "brewing", "brick", "bridge", "bright", "bring", "broad", "brother",
  "brown", "brush", "bubble", "build", "builder", "building", "bullet", "bundle",
  "burn", "burst", "bus", "business", "busy", "buy", "cache", "cage", "calculate",
  "calculator", "call", "camera", "camp", "campaign", "can", "cancel", "candle",
  "canvas", "cap", "cape", "capital", "card", "care", "careful", "carry", "cart",
  "case", "cash", "cast", "castle", "cat", "catch", "category", "cauldron", "cause",
  "cave", "cell", "center", "central", "century", "certain", "chain", "chair",
  "challenge", "chamber", "chance", "change", "channel", "chapter", "char", "character",
  "charge", "chart", "chase", "cheap", "cheat", "check", "cheek", "cheer", "chef",
  "chest", "chicken", "chief", "child", "choice", "choose", "circle", "city",
  "claim", "clan", "clarity", "class", "classic", "claw", "clay", "clean", "clear",
  "clerk", "clever", "click", "client", "cliff", "climb", "cloak", "clock", "close",
  "cloth", "cloud", "clover", "club", "clue", "coal", "coast", "coat", "code",
  "coin", "cold", "collar", "collect", "collection", "college", "colony", "color",
  "column", "combat", "combination", "combine", "come", "comedy", "comfort", "command",
  "comment", "commerce", "common", "community", "companion", "company", "compare",
  "comparison", "compete", "competition", "complete", "completion", "complex",
  "component", "compose", "composition", "compound", "computer", "concept", "concern",
  "concert", "conclude", "conclusion", "condition", "conduct", "cone", "conference",
  "confidence", "confirm", "conflict", "confuse", "confusion", "congratulate",
  "connect", "connection", "conquer", "conservation", "consider", "consist", "console",
  "constant", "construct", "construction", "consume", "consumable", "contact",
  "contain", "container", "content", "contest", "context", "continent", "continue",
  "continuous", "contract", "contrary", "contrast", "control", "conversation",
  "convert", "cook", "cool", "copper", "copy", "cord", "core", "corner", "correct",
  "correction", "cost", "cotton", "couch", "cough", "could", "council", "counsel",
  "count", "counter", "country", "county", "couple", "courage", "course", "court",
  "cousin", "cover", "cow", "crack", "craft", "crafting", "crash", "crate", "craw",
  "crazy", "cream", "create", "creation", "creative", "creature", "credit", "crew",
  "crime", "critic", "critical", "crop", "cross", "crowd", "crown", "crucial",
  "crude", "crystal", "cube", "cult", "culture", "cup", "cure", "curious", "curl",
  "currency", "current", "cursor", "curve", "custom", "customer", "customize",
  "cut", "cycle", "daily", "damage", "dance", "danger", "dark", "darling", "dashboard",
  "data", "database", "date", "daughter", "day", "dead", "deal", "dear", "death",
  "debate", "debt", "decade", "decay", "decide", "decision", "deck", "declare",
  "decline", "decorate", "decoration", "decrease", "deep", "defeat", "defend",
  "defender", "defense", "define", "definite", "definition", "degree", "delay",
  "delegate", "delete", "delicate", "delicious", "deliver", "delivery", "demand",
  "democrat", "demon", "demonstrate", "dense", "department", "departure", "depend",
  "dependent", "deposit", "depress", "depth", "deputy", "derive", "descend",
  "describe", "description", "desert", "deserve", "design", "designer", "desire",
  "desk", "desktop", "despair", "despite", "destination", "destroy", "destruction",
  "detail", "detailed", "detect", "determine", "develop", "developer", "development",
  "device", "devil", "devise", "devote", "devotion", "diagram", "dial", "dialogue",
  "diamond", "diary", "dictate", "dictionary", "did", "die", "diet", "differ",
  "difference", "different", "difficult", "difficulty", "dig", "digest", "digital",
  "dignity", "dimension", "diminish", "dinner", "dip", "direct", "direction",
  "director", "dirt", "dirty", "disable", "disagree", "disappear", "disappoint",
  "disaster", "disc", "discard", "discharge", "discipline", "disclose", "discount",
  "discover", "discovery", "discuss", "discussion", "disease", "disgrace", "disguise",
  "dish", "dislike", "dismiss", "disorder", "display", "displease", "disposal",
  "dispose", "dispute", "disregard", "disrupt", "dissolve", "distance", "distant",
  "distinction", "distinguish", "distort", "distract", "distraction", "distress",
  "distribute", "distribution", "district", "disturb", "disturbance", "dive",
  "diverse", "divide", "divine", "division", "divorce", "dsa", "dungeon", "every",
  "everyone", "everything", "everywhere", "example", "except", "exist", "existence",
  "explain", "explanation", "export", "express", "expression", "face", "fact",
  "fail", "failed", "failure", "family", "far", "fast", "father", "fear", "feature",
  "feed", "feel", "feeling", "few", "field", "fight", "figure", "fill", "final",
  "finally", "find", "fine", "finger", "finish", "fire", "first", "fish", "five",
  "fix", "flame", "flash", "flashcard", "flashcards", "flat", "flight", "floor",
  "flow", "flower", "fly", "focus", "folder", "follow", "following", "follower", "followers", "follows", "followed", "food", "foot", "for",
  "force", "foreign", "forest", "forget", "form", "formal", "former", "forward",
  "four", "free", "friend", "friendly", "from", "front", "full", "fun", "function",
  "further", "future", "game", "gamification", "garden", "gas", "gate", "gather",
  "general", "generation", "get", "girl", "give", "glad", "glass", "go", "goal",
  "god", "gold", "golden", "good", "grade", "grand", "grass", "great", "green",
  "ground", "group", "groups", "grow", "growth", "guard", "guide", "habit", "habits",
  "hair", "half", "hall", "hand", "hang", "happen", "happy", "hard", "hat", "have",
  "he", "head", "health", "hear", "heart", "heat", "heavy", "hello", "help",
  "helper", "her", "here", "hero", "herself", "high", "him", "himself", "his",
  "history", "hit", "hold", "hole", "home", "hope", "horse", "hot", "hour", "house",
  "how", "however", "huge", "human", "hundred", "hunger", "hungry", "hunt", "hunter",
  "hurt", "husband", "idea", "ide", "identify", "if", "ignore", "ill", "image",
  "imagine", "immediate", "important", "improve", "in", "inch", "include", "income",
  "increase", "indeed", "independent", "index", "indicate", "individual", "industry",
  "influence", "inform", "information", "ingredient", "ingredients", "initial",
  "initialize", "injury", "inline", "inner", "input", "inquire", "inquiry",
  "inside", "inspect", "instance", "instant", "instantly", "instead", "instruct",
  "instruction", "instrument", "insurance", "intellect", "intend", "intense",
  "intent", "interaction", "interactive", "intercept", "interest", "internal",
  "interpret", "interrupt", "into", "introduce", "introduction", "invent",
  "inventory", "investigate", "invite", "involve", "iron", "is", "island", "issue",
  "it", "item", "items", "its", "itself", "jacket", "jail", "jar", "jaw", "jeans",
  "jelly", "jewel", "job", "join", "joint", "joke", "journal", "journey", "joy",
  "judge", "judgment", "juice", "jump", "jungle", "junior", "jury", "just",
  "justice", "justify", "keen", "keep", "keeper", "kettle", "key", "keyboard",
  "kick", "kid", "kill", "kind", "king", "kingdom", "kiss", "kitchen", "kite",
  "knee", "kneel", "knife", "knight", "knit", "knock", "knot", "know", "knowledge",
  "lab", "label", "labor", "lace", "lack", "ladder", "lady", "lake", "lamp",
  "land", "landscape", "lane", "language", "lantern", "lap", "large", "last",
  "late", "lately", "later", "latest", "latin", "latter", "laugh", "launch",
  "laundry", "law", "lawful", "lawyer", "lay", "layer", "lazy", "lead", "leader",
  "leaderboard", "leaf", "league", "leak", "lean", "leap", "learn", "learned",
  "learner", "learning", "lease", "least", "leather", "leave", "lecture", "led",
  "left", "leg", "legacy", "legal", "legend", "legendary", "lemon", "lend",
  "length", "lens", "less", "lesson", "lessons", "lest", "let", "lets", "letter",
  "level", "lever", "liability", "liable", "liar", "liberal", "liberty", "library",
  "license", "lick", "lid", "lie", "life", "lift", "light", "lightning", "like",
  "likelihood", "likely", "limb", "lime", "limit", "line", "linear", "link",
  "lion", "lip", "liquid", "list", "listen", "listener", "literal", "literary",
  "literature", "little", "live", "lively", "liver", "load", "loan", "local",
  "locate", "location", "lock", "lodge", "log", "logic", "logical", "logotype",
  "lonely", "long", "look", "loop", "loose", "loot", "lord", "lose", "loss",
  "lost", "lot", "loud", "love", "lovely", "low", "lower", "loyal", "loyalty",
  "luck", "lucky", "luggage", "lump", "lunch", "lung", "lure", "lust", "luxury",
  "lying", "machine", "mad", "magic", "magical", "magnet", "magnificent", "magnify",
  "maid", "mail", "main", "maintain", "maintenance", "major", "majority", "make",
  "maker", "making", "male", "malice", "mammal", "man", "manage", "management",
  "manager", "mandate", "manner", "manor", "manual", "manual", "manufacture",
  "many", "map", "marble", "march", "margin", "marine", "mark", "market", "marriage",
  "marry", "mars", "marsh", "marvel", "mascot", "mask", "mass", "massage", "master",
  "match", "mate", "material", "mathematics", "matter", "mature", "maximum",
  "may", "maybe", "mayor", "me", "meadow", "meal", "mean", "meaning", "meantime",
  "measure", "measurement", "meat", "mechanic", "mechanical", "mechanism",
  "medal", "media", "medical", "medicine", "medieval", "meet", "meeting", "melody",
  "melt", "member", "membership", "membrane", "memo", "memory", "mental",
  "mention", "menu", "merchant", "mercy", "mere", "merely", "merge", "merit",
  "message", "messages", "messenger", "metal", "metallic", "meter", "method",
  "mid", "middle", "midnight", "midst", "might", "mighty", "mild", "mile", "military",
  "milk", "mill", "million", "mind", "mine", "mineral", "minimum", "minister",
  "ministry", "minor", "minority", "mint", "minute", "minutes", "miracle",
  "mirror", "mischief", "miserable", "misery", "mislead", "miss", "missile",
  "missing", "mission", "mist", "mistake", "mix", "mixture", "moan", "mob",
  "mobile", "mock", "mockup", "mode", "model", "moderate", "modern", "modest",
  "modify", "module", "modules", "moist", "moisture", "molecule", "moment",
  "monarch", "monday", "money", "monkey", "monster", "month", "monthly",
  "monument", "mood", "moon", "moral", "more", "moreover", "morning", "mortal",
  "mortar", "mortgage", "most", "mostly", "motel", "mother", "motion", "motive",
  "motor", "mount", "mountain", "mourn", "mouse", "mouth", "move", "movement",
  "movie", "much", "mud", "multiply", "multitask", "murder", "muscle", "museum",
  "music", "musical", "musician", "must", "mutter", "mutual", "my", "myself",
  "mystery", "mystic", "nail", "naked", "name", "namely", "nap", "narrow", "nasty",
  "nation", "national", "native", "natural", "nature", "naval", "navigation",
  "navy", "near", "nearby", "nearly", "neat", "necessary", "necessity", "neck",
  "need", "needle", "negative", "neglect", "negotiate", "neighbor", "neighborhood",
  "neither", "nephew", "nerve", "nest", "net", "network", "neutral", "never",
  "nevertheless", "new", "newly", "news", "newspaper", "next", "nice", "niche",
  "nickel", "niece", "night", "nightcap", "nine", "noble", "nobody", "nod",
  "noise", "noisy", "nominate", "none", "nonsense", "noon", "nor", "normal",
  "norm", "north", "northern", "nose", "not", "note", "notes", "notebook",
  "nothing", "notice", "notify", "notion", "noun", "nouns", "novel", "novelist",
  "now", "nowhere", "nuclear", "nuance", "nuisance", "null", "number", "numerical",
  "numerous", "nurse", "nursery", "nut", "oak", "oar", "oath", "obedience",
  "obedient", "obey", "object", "objection", "objective", "obligation", "oblige",
  "observe", "obstacle", "obtain", "obvious", "obviously", "occasion",
  "occasional", "occupation", "occupy", "occur", "occurred", "occurrence",
  "ocean", "octocat", "odd", "odds", "odor", "of", "off", "offend",
  "offense", "offensive", "offer", "office", "officer", "official", "offline",
  "offset", "offspring", "often", "oh", "oil", "old", "olive", "omen",
  "omit", "on", "once", "one", "ongoing", "onion", "only", "onset", "onto",
  "open", "opened", "opening", "opera", "operate", "operation", "operator",
  "opinion", "opponent", "opportunity", "oppose", "opposite", "opposition",
  "oppress", "opt", "optic", "optimal", "optimize", "optimum", "option",
  "optional", "options", "or", "oracle", "orange", "orbit", "order", "ordered",
  "orderly", "ordinary", "ore", "organ", "organic", "organism", "organize",
  "origin", "original", "ornament", "orphan", "other", "otherwise", "ought",
  "our", "ours", "ourselves", "out", "outbreak", "outcome", "outdoor",
  "outer", "outfit", "outlaw", "outlet", "outline", "outlook", "output",
  "outrage", "outside", "outstanding", "oval", "oven", "over", "overall",
  "overcome", "overflow", "overhead", "overlap", "overlook", "overnight",
  "overrun", "oversee", "overtake", "overthrow", "overwhelm", "owe", "owl",
  "own", "owner", "ownership", "ox", "oxygen", "oyster", "pace", "pack",
  "package", "packet", "pact", "pad", "page", "pages", "paid", "pain",
  "painful", "paint", "painter", "painting", "pair", "palace", "paladin",
  "pale", "palm", "pan", "panel", "panic", "pant", "paper", "parade",
  "paragraph", "parallel", "paralyze", "parcel", "pardon", "parent",
  "parish", "park", "parliament", "parlor", "part", "partial", "particle",
  "particles", "particular", "partly", "partner", "partnership", "party",
  "pass", "passage", "passenger", "passion", "passive", "passport", "past",
  "paste", "pastor", "pasture", "pat", "patch", "patches", "patent", "path",
  "patience", "patient", "patrol", "patron", "pattern", "pause", "pave",
  "pavement", "paw", "paws", "pay", "payment", "peace", "peaceful", "peach",
  "peak", "pear", "peasant", "peck", "peculiar", "pedal", "peel", "peep",
  "peer", "peg", "pen", "penalty", "pencil", "penetrate", "penny", "pension",
  "people", "pepper", "per", "perceive", "percent", "percentage",
  "perception", "perch", "perfect", "perfectly", "perform", "performance",
  "peril", "period", "periodic", "perish", "permanent", "permission",
  "permit", "perplex", "persecute", "persist", "person", "personal",
  "personality", "personally", "perspective", "persuade", "pet", "pets",
  "petition", "petroleum", "petty", "phantom", "phase", "phenomenon",
  "phone", "photo", "phrase", "physical", "physics", "pianist", "piano",
  "pick", "picket", "pickle", "picture", "pie", "piece", "pierce", "piety",
  "pig", "pigeon", "pigment", "pile", "pilgrim", "pill", "pillar", "pillow",
  "pilot", "pin", "pinch", "pine", "pink", "pint", "pioneer", "pipe", "pirate",
  "pistol", "pit", "pitch", "pity", "place", "plague", "plain", "plan",
  "plane", "planet", "plank", "planning", "plant", "plantation", "plaster",
  "plastic", "plate", "platform", "platinum", "play", "player", "playground",
  "plea", "plead", "pleasant", "please", "pleased", "pleasure", "pledge",
  "plentiful", "plenty", "plight", "plot", "plow", "pluck", "plug", "plume",
  "plump", "plunge", "plural", "plus", "plush", "pneumonia", "pocket", "poem",
  "poet", "poetry", "point", "pointer", "points", "poison", "poke", "polar",
  "pole", "police", "policy", "polish", "polite", "politics", "poll", "pond",
  "pool", "poor", "pop", "pope", "popular", "population", "porch", "pore",
  "pork", "port", "portable", "porter", "portion", "portrait", "portray",
  "pose", "poses", "position", "positive", "possess", "possession",
  "possessive", "possible", "possibly", "post", "postage", "poster",
  "postman", "postpone", "pot", "potato", "potent", "potion", "potions",
  "potter", "pouch", "poultry", "pound", "pour", "poverty", "powder",
  "power", "powerful", "practical", "practically", "practice", "praise",
  "pray", "prayer", "preach", "preacher", "precaution", "precede",
  "precedent", "precious", "precise", "precisely", "precision",
  "predecessor", "predict", "predictive", "predominant", "preface",
  "prefer", "preference", "preferences", "pregnancy", "pregnant",
  "prejudice", "preliminary", "premium", "prepare", "preposition",
  "prescribe", "presence", "present", "presentation", "preserve",
  "president", "press", "pressure", "prestige", "presume", "pretend",
  "pretext", "pretty", "prevail", "prevalent", "prevent", "prevention",
  "previous", "previously", "prey", "price", "prick", "pride", "priest",
  "primary", "prime", "primitive", "prince", "princess", "principal",
  "principle", "print", "printer", "prior", "priority", "prison",
  "prisoner", "private", "privilege", "prize", "probability", "probable",
  "probably", "probe", "problem", "problems", "procedure", "proceed",
  "process", "procession", "proclaim", "proctor", "procure", "produce",
  "producer", "product", "production", "productive", "productivity",
  "profession", "professional", "professor", "profile", "profiles",
  "profit", "profound", "program", "programmer", "programming", "progress",
  "progression", "prohibit", "project", "projects", "prolong", "prominent",
  "promise", "promote", "promotion", "prompt", "prompts", "prone",
  "pronoun", "pronounce", "proof", "proofread", "prop", "propaganda",
  "propel", "proper", "properly", "property", "prophecy", "prophet",
  "proportion", "propose", "proposed", "proposition", "prose", "prosecute",
  "prospect", "prosper", "prosperity", "protect", "protection",
  "protective", "protector", "protest", "protocol", "proud", "proudly",
  "prove", "proverb", "provide", "providers", "province", "provision",
  "provoke", "prow", "prudence", "prudent", "psychology", "public",
  "publication", "publish", "publisher", "puck", "pudding", "puddle",
  "puff", "pull", "pulp", "pulpit", "pulse", "pulsing", "pump", "pumpkin",
  "punch", "punctual", "punctuation", "punish", "punishment", "pupil",
  "pupils", "puppy", "purchase", "pure", "purely", "purple", "purpose",
  "purse", "pursue", "pursuit", "push", "pushed", "putting", "puzzle",
  "puzzles", "quaint", "quake", "qualification", "qualify", "quality",
  "quantity", "quarrel", "quarry", "quart", "quarter", "quarterly", "queen",
  "queer", "quell", "quench", "query", "question", "questionnaire",
  "questions", "queue", "queued", "quick", "quickly", "quicksilver", "quiet",
  "quietly", "quill", "quilt", "quit", "quite", "quiver", "quiz", "quizzes",
  "quota", "quote", "quotes", "rabbit", "race", "racial", "rack", "radar",
  "radial", "radiant", "radiate", "radiation", "radical", "radio", "radish",
  "raft", "rage", "raid", "rail", "railroad", "railway", "rain", "rainbow",
  "rainy", "raise", "rake", "rally", "ram", "ranch", "random", "randomly",
  "range", "rank", "rapid", "rapidly", "rare", "rarely", "rascal", "rash",
  "rate", "rather", "ratify", "ratio", "rational", "rattle", "ravage",
  "raw", "ray", "razor", "reach", "react", "reaction", "reactions",
  "reactive", "reactor", "read", "reader", "readers", "readily",
  "reading", "ready", "real", "realistic", "reality", "realization",
  "realize", "really", "realm", "reap", "rear", "reason", "reasonable",
  "rebel", "rebellion", "recall", "recap", "receipt", "receive",
  "received", "receiver", "recent", "recently", "reception", "recipe",
  "recipes", "recipient", "reciprocal", "recite", "reckless", "reckon",
  "reclaim", "recognition", "recognize", "recommend", "recommendation",
  "recommending", "reconcile", "reconstruct", "record", "recorder",
  "recover", "recovery", "recreation", "recruit", "rect", "rectangle",
  "recur", "recurring", "red", "redeem", "reduce", "reduction",
  "redundant", "reef", "refer", "referee", "reference", "references",
  "referendum", "refine", "refinery", "reflect", "reflection", "reform",
  "refrain", "refresh", "refrigerator", "refuge", "refugee", "refusal",
  "refuse", "refute", "regain", "regal", "regard", "regarding",
  "regardless", "regime", "regiment", "region", "regional", "register",
  "registration", "regret", "regular", "regularly", "regulate",
  "regulation", "rehabilitate", "reign", "rein", "force", "reinforce",
  "reject", "rejection", "rejoice", "relate", "related", "relation",
  "relationship", "relative", "relatively", "relax", "relaxing",
  "relay", "release", "relevant", "reliable", "reliance", "relief",
  "relieve", "religion", "religious", "relinquish", "relish", "reluctant",
  "rely", "remain", "remainder", "remains", "remark", "remarkable",
  "remedy", "remember", "remind", "reminder", "remission", "remit",
  "remnant", "remote", "removal", "remove", "removed", "render",
  "rendering", "renew", "renewal", "renounce", "renown", "rent",
  "repair", "repeal", "repeat", "repeatedly", "repel", "repent",
  "repetition", "replace", "replacement", "report", "reports",
  "represent", "representative", "repress", "reproduce", "reproduction",
  "republic", "reputation", "request", "requests", "require",
  "requirement", "requirements", "requisite", "rescue", "research",
  "researcher", "resemble", "resent", "reserve", "reservoir",
  "reside", "residence", "resident", "resign", "resignation",
  "resin", "resist", "resistance", "resistant", "resolute",
  "resolution", "resolve", "resolved", "resonance", "resort",
  "resource", "resources", "respect", "respective", "respiration",
  "respire", "respond", "response", "responses", "responsibility",
  "responsible", "rest", "restart", "restaurant", "restoration",
  "restore", "restored", "restrain", "restraint", "restrict",
  "restriction", "result", "results", "resume",
  "said", "same", "save", "saved", "saving", "say", "saying", "says", "scene", "scent",
  "schedule", "school", "science", "score", "scream", "screen", "screens", "screw",
  "scribble", "scroll", "scrolls", "sea", "seal", "search", "season", "seat", "second",
  "seconds", "secret", "section", "sector", "secure", "security", "see", "seed", "seeing",
  "seek", "seem", "seemed", "seems", "seen", "seldom", "select", "selected", "selecting",
  "selection", "self", "sell", "send", "sending", "sends", "sense", "sensitive", "sent",
  "sentence", "sentences", "separate", "separated", "separating", "separation", "sequence",
  "series", "serious", "servant", "serve", "server", "service", "session", "set", "sets",
  "setting", "settings", "settle", "seven", "several", "severe", "sew", "shadow", "shake",
  "shall", "shame", "shape", "share", "shared", "shares", "sharing", "shark", "sharp",
  "shatter", "she", "shear", "shed", "sheep", "sheet", "shelf", "shell", "shelter",
  "shield", "shift", "shine", "shiny", "ship", "shirt", "shock", "shoe", "shoes",
  "shone", "shook", "shoot", "shop", "shopping", "shore", "short", "shortly", "shorts",
  "shot", "should", "shoulder", "shout", "shove", "show", "showed", "shower", "showing",
  "shown", "shows", "shrank", "shriek", "shrimp", "shrink", "shroud", "shrub", "shrug",
  "shut", "shy", "sick", "side", "sides", "sigh", "sight", "sign", "signal", "signature",
  "significance", "significant", "silence", "silent", "silk", "silly", "silver", "similar",
  "simple", "simplicity", "simply", "since", "sing", "singer", "single", "sink", "sip",
  "sir", "sister", "sit", "site", "sites", "sits", "sitting", "situation", "six", "size",
  "sizes", "skate", "sketch", "ski", "skill", "skills", "skin", "skip", "skirt", "skull",
  "sky", "slam", "slang", "slant", "slap", "slash", "slate", "slave", "sleek", "sleep",
  "sleepy", "sleeve", "slept", "slice", "slide", "slides", "slid", "slight", "slightly",
  "slim", "slip", "slit", "slope", "slot", "slots", "slow", "slowly", "slug", "slum",
  "slump", "sly", "small", "smart", "smash", "smell", "smile", "smiled", "smiles",
  "smiling", "smoke", "smooth", "smuggle", "snake", "snap", "snatch", "sneak", "sneeze",
  "sniff", "snow", "so", "soak", "soap", "soar", "sob", "sober", "soccer", "social",
  "society", "sock", "socks", "soda", "sofa", "soft", "softly", "software", "soil",
  "solar", "sold", "soldier", "sole", "solely", "solid", "solitary", "solitude", "solo",
  "solve", "solved", "solver", "solves", "solving", "some", "somebody", "somehow",
  "someone", "something", "sometime", "sometimes", "somewhat", "somewhere", "son",
  "song", "soon", "soot", "sore", "sorrow", "sorry", "sort", "soul", "sound", "soup",
  "sour", "source", "sources", "south", "southern", "sow", "space", "spaces", "spade",
  "span", "spare", "spark", "sparkle", "sparkling", "sparks", "sparrow", "speak",
  "speaker", "speaking", "speaks", "special", "specialist", "specialize", "species",
  "specific", "specifically", "specify", "specimen", "spectacle", "speech", "speed",
  "spell", "spellcheck", "spellchecker", "spellchecking", "spelled", "spelling",
  "spells", "spelt", "spend", "spending", "spent", "sphere", "spice", "spicy", "spider",
  "spike", "spill", "spilt", "spin", "spinal", "spindle", "spine", "spinner", "spinning",
  "spire", "spirit", "spit", "spite", "splash", "splendid", "split", "splits", "splitting",
  "spoil", "spoilt", "spoke", "spoken", "sponge", "sponsor", "spontaneous", "spoon",
  "sport", "sports", "spot", "spots", "spouse", "spout", "sprain", "sprang", "sprawl",
  "spray", "spread", "spree", "spring", "sprinkle", "sprint", "sprite", "sprout", "spur",
  "spy", "squad", "square", "squares", "squash", "squat", "squeak", "squeeze", "squid",
  "squint", "squirrel", "stab", "stable", "stack", "stadium", "staff", "stage", "stages",
  "stagger", "stain", "stair", "stairs", "stake", "stale", "stalk", "stall", "stammer",
  "stamp", "stand", "standard", "standing", "stands", "stank", "staple", "star",
  "stare", "stared", "stares", "staring", "stark", "starry", "stars", "start", "started",
  "starting", "starts", "starve", "state", "stated", "statement", "statements", "states",
  "stating", "static", "station", "stationary", "stationery", "statistics", "statue",
  "stature", "status", "statute", "stay", "stayed", "staying", "stays", "steady", "steak",
  "steal", "steam", "steed", "steel", "steep", "steer", "stem", "stencil", "step",
  "steps", "stereo", "sterile", "stern", "stew", "steward", "stick", "sticky", "stiff",
  "stifle", "still", "stimulate", "stimulus", "sting", "stint", "stir", "stitch", "stock",
  "stocking", "stole", "stolen", "stomach", "stone", "stood", "stool", "stoop", "stop",
  "stopped", "stopping", "stops", "storage", "store", "stored", "stores", "storing",
  "storm", "stormy", "story", "stories", "stout", "stove", "straight", "straighten",
  "strain", "strait", "strand", "strange", "stranger", "strap", "strategy", "strategies",
  "strategic", "straw", "stray", "streak", "streaks", "stream", "street", "streets",
  "strength", "strengthen", "stress", "stretch", "strew", "strict", "stride", "strife",
  "strike", "striking", "string", "strings", "strip", "stripe", "strive", "strobe",
  "stroke", "stroll", "strong", "strongly", "strove", "struck", "structure", "structures",
  "structural", "struggle", "strut", "stub", "stubborn", "student", "students", "studio",
  "study", "studied", "studies", "studying", "studyquest", "stuff", "stumble", "stump",
  "stung", "stunt", "stupid", "sturdy", "style", "styles", "sub", "subject", "sublime",
  "submarine", "submerge", "submit", "submitted", "submits", "submitting", "subordinate",
  "subscribe", "subsequent", "subside", "subsidy", "substance", "substantial", "substitute",
  "subtle", "subtly", "subtract", "suburb", "subway", "succeed", "succeeded", "succeeds",
  "success", "successful", "successfully", "succession", "successive", "successor",
  "succumb", "such", "suck", "sudden", "suddenly", "sue", "suffer", "suffered", "suffering",
  "suffers", "suffice", "sufficient", "sufficiently", "suffix", "sugar", "suggest",
  "suggested", "suggesting", "suggestion", "suggestions", "suggests", "suicide", "suit",
  "suitable", "suite", "suitor", "sulfur", "sullen", "sum", "summarize", "summary",
  "summer", "summit", "summon", "sun", "sunday", "sunny", "sunrise", "sunset", "sunshine",
  "super", "superb", "superficial", "superfluous", "superintend", "superior", "superlative",
  "supernatural", "supersede", "supervise", "supper", "supple", "supplement", "supply",
  "supplier", "support", "supported", "supporting", "supports", "suppose", "supposed",
  "supposing", "suppress", "supreme", "sure", "surely", "surf", "surface", "surge",
  "surgeon", "surgery", "surly", "surmise", "surmount", "surpass", "surplus", "surprise",
  "surprised", "surprising", "surrender", "surround", "surrounded", "surrounding",
  "surroundings", "survey", "survive", "survivor", "suscept", "suspect", "suspend",
  "suspense", "suspicion", "suspicious", "sustain", "swagger", "swallow", "swam",
  "swamp", "swan", "swap", "swarm", "swat", "sway", "swear", "sweat", "sweater",
  "sweaty", "sweep", "sweet", "sweeten", "sweetheart", "sweetness", "swell", "swept",
  "swerve", "swift", "swiftly", "swim", "swimmer", "swimming", "swims", "swindle",
  "swine", "swing", "swirl", "swish", "switch", "swivel", "swollen", "swoop", "swore",
  "sworn", "swum", "swung", "syllabus", "symbol", "symbols", "symbolic", "symmetry",
  "sympathy", "sympathize", "symptom", "syndicate", "synod", "synonym", "syntax",
  "synthesis", "synthetic", "syringe", "system", "systems", "systematic", "systematically",
  "tail", "take", "task",
  "tasks", "teach", "teacher", "teaching", "team", "tell", "term", "test",
  "text", "than", "thank", "that", "the", "their", "them", "theme",
  "then", "there", "therefore", "these", "they", "thing", "things", "think",
  "thinking", "this", "those", "though", "thought", "thousand", "three",
  "through", "throw", "thursday", "thus", "ticket", "time", "timetable",
  "tiny", "title", "to", "today", "together", "told", "tomorrow", "tonight",
  "too", "took", "tool", "tools", "top", "total", "touch", "toward", "town",
  "toy", "trace", "track", "tracking", "trade", "traffic", "train", "training",
  "transfer", "transition", "translate", "travel", "treasure", "treat", "tree",
  "trial", "triangle", "trick", "tried", "trigger", "trip", "trouble", "true",
  "truly", "trust", "truth", "try", "tuesday", "turn", "turned", "tutor",
  "twice", "type", "types", "typing", "typo", "typos", "ugly", "ultimate",
  "umbrella", "unable", "uncle", "under", "understand", "understanding",
  "union", "unique", "unit", "united", "unity", "universal", "universe",
  "university", "unknown", "unless", "until", "unusual", "up", "update",
  "updated", "updates", "upon", "upper", "upward", "urban", "urge", "urgent",
  "us", "use", "used", "user", "username", "users", "using", "usual",
  "usually", "utility", "vacant", "vacuum", "vague", "vain", "valiant", "valid",
  "validate", "validation", "valley", "valuable", "value", "values", "valve",
  "vanish", "vapor", "variable", "variables", "variant", "variants", "variety",
  "various", "vary", "vase", "vast", "vault", "vector", "vegetable", "vehicle",
  "veil", "vein", "velocity", "velvet", "vendor", "venture", "verb", "verbs",
  "verdict", "verify", "version", "vertical", "very", "vessel", "vest", "veteran",
  "vex", "via", "vibrant", "vibrate", "vibration", "vicar", "vice", "vicinity",
  "victim", "victory", "view", "viewer", "viewing", "views", "vigil", "vigilant",
  "vigor", "vigorous", "vile", "villa", "village", "villain", "vine", "vinegar",
  "violate", "violation", "violence", "violent", "violet", "violin", "virgin",
  "virtual", "virtue", "virus", "visage", "visible", "vision", "visit", "visitor",
  "visor", "visual", "visualize", "visualizing", "vital", "vitamin", "vivid",
  "vocabulary", "vocal", "voice", "void", "volcano", "volume", "voluntary",
  "volunteer", "vomit", "vote", "vow", "vowel", "voyage", "vulgar", "vulnerable",
  "wade", "wafer", "waffle", "wage", "wagon", "wail", "waist", "wait", "waiting",
  "wake", "walk", "walkthrough", "wall", "wallet", "walnut", "wander", "want",
  "war", "ward", "wardrobe", "warm", "warmth", "warn", "warning", "warnings",
  "warrant", "warrior", "wary", "was", "wash", "waste", "watch", "water",
  "wave", "waving", "wax", "way", "we", "weak", "wealth", "weapon", "wear",
  "weary", "weather", "weave", "web", "wednesday", "weed", "week", "weekly",
  "weep", "weigh", "weight", "weird", "welcome", "welfare", "well", "went",
  "were", "west", "western", "wet", "whale", "what", "whatever", "wheat",
  "wheel", "when", "whenever", "where", "whereas", "whereby", "wherever",
  "whether", "which", "while", "whip", "whirl", "whisper", "whistle", "white",
  "whiteboard", "who", "whoever", "whole", "wholly", "whom", "whose", "why",
  "wicked", "wide", "widow", "width", "wield", "wife", "wiggle", "wild",
  "wilderness", "will", "willing", "willow", "win", "wind", "window", "windy",
  "wine", "wing", "wings", "wink", "winner", "winter", "wipe", "wire", "wisdom",
  "wise", "wish", "wit", "witch", "with", "withdraw", "withdrawal", "wither",
  "within", "without", "witness", "wizard", "woe", "wolf", "woman", "womb",
  "won", "wonder", "wonderful", "wont", "wood", "wooden", "wool", "word",
  "words", "work", "worked", "worker", "workers", "working", "works", "workspace",
  "world", "worm", "worry", "worse", "worship", "worst", "worth", "worthy",
  "would", "wound", "wrap", "wrapper", "wrath", "wreath", "wreck", "wrench",
  "wrestle", "wretched", "wriggle", "wring", "wrinkle", "wrist", "write",
  "writer", "writes", "writing", "written", "wrong", "wrote", "wry", "yarn",
  "yawn", "yawns", "year", "yearly", "yeast", "yell", "yellow", "yes", "yesterday",
  "yet", "yield", "yoke", "yolk", "you", "young", "your", "yours", "yourself",
  "yourselves", "youth", "zeal", "zealous", "zenith", "zero", "zest", "zinc",
  "zone", "zoo", "zoom", "zzz", "zzzs"
];

// Load vocabulary list into a set for fast lookup
const VOCABULARY = new Set(VOCABULARY_LIST);

// ── Custom Words Dictionary (stored in localStorage) ──
let customWordsSet = new Set<string>();
let customWordsLoaded = false;

export function loadCustomWords() {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('studyquest_custom_dictionary');
      if (stored) {
        const words = JSON.parse(stored);
        if (Array.isArray(words)) {
          customWordsSet = new Set(words.map(w => w.toLowerCase()));
        }
      }
    } catch (e) {
      console.error('Failed to load custom words from localStorage', e);
    }
  }
  customWordsLoaded = true;
}

export function addToCustomDictionary(word: string) {
  const clean = cleanWord(word);
  const base = clean.base.toLowerCase();
  if (!base || base.length <= 1) return;
  
  if (!customWordsLoaded) {
    loadCustomWords();
  }
  customWordsSet.add(base);
  
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('studyquest_custom_dictionary', JSON.stringify(Array.from(customWordsSet)));
      window.dispatchEvent(new Event('studyquest_custom_dict_update'));
    } catch (e) {
      console.error('Failed to save custom words to localStorage', e);
    }
  }
}

// ── Full English Dictionary Asynchronous Loader ──
let DICTIONARY: Set<string> | null = null;
let dictionaryLoaded = false;

export function loadEnglishDictionary() {
  if (typeof window !== 'undefined' && !dictionaryLoaded) {
    dictionaryLoaded = true;
    fetch('/dictionary.json')
      .then((res) => res.json())
      .then((words: string[]) => {
        DICTIONARY = new Set(words);
        window.dispatchEvent(new Event('studyquest_custom_dict_update'));
      })
      .catch((err) => {
        console.error('Failed to load English dictionary', err);
        dictionaryLoaded = false;
      });
  }
}

// Start loading the dictionary lazily in browser idle time
if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => loadEnglishDictionary());
  } else {
    setTimeout(loadEnglishDictionary, 1000);
  }
}

// ── Common Typo Autocorrect Mapping ──
export const COMMON_TYPOS: Record<string, string> = {
  "teh": "the",
  "recieve": "receive",
  "recieved": "received",
  "definately": "definitely",
  "seperate": "separate",
  "seperated": "separated",
  "accomodate": "accommodate",
  "wierd": "weird",
  "dont": "don't",
  "cant": "can't",
  "wont": "won't",
  "shouldnt": "shouldn't",
  "couldnt": "couldn't",
  "wouldnt": "wouldn't",
  "isnt": "isn't",
  "arent": "aren't",
  "havent": "haven't",
  "hasnt": "hasn't",
  "hadnt": "hadn't",
  "occured": "occurred",
  "goverment": "government",
  "libary": "library",
  "tommorrow": "tomorrow",
  "untill": "until",
  "truely": "truly",
  "comming": "coming",
  "writen": "written",
  "writin": "writing",
  "absense": "absence",
  "arguement": "argument",
  "alot": "a lot",
  "existance": "existence",
  "neccessary": "necessary",
  "unneccessary": "unnecessary",
  "recommending": "recommending",
  "recommend": "recommend",
  "embarass": "embarrass",
  "enviroment": "environment",
  "suprise": "surprise",
  "yesteray": "yesterday",
  "tuesday": "Tuesday",
  "wednesday": "Wednesday",
  "thursday": "Thursday",
  "saturday": "Saturday",
  "sunday": "Sunday",
  "febuary": "February",
  "calender": "calendar",
  "peaple": "people",
  "freind": "friend",
  "freinds": "friends",
  "beleive": "believe",
  "acheive": "achieve",
  "pollowing": "following",
  "folowing": "following",
  "follwing": "following",
  "occired": "occurred",
};

// ── Extract word base, preserving leading/trailing punctuation and capitalization ──
export function cleanWord(word: string): CleanedWord {
  // Matches leading non-word chars, central word base (letters, apostrophes, dashes), trailing non-word chars
  const match = word.match(/^([^\w'-]*)([\w'-]+)([^\w'-]*)$/);
  if (!match) {
    return { raw: word, base: word, leading: "", trailing: "", isCapitalized: false };
  }
  const leading = match[1] || "";
  const base = match[2] || "";
  const trailing = match[3] || "";
  const isCapitalized = base.length > 0 && base[0] === base[0].toUpperCase() && base[0] !== base[0].toLowerCase();
  return { raw: word, base, leading, trailing, isCapitalized };
}

// ── Correct common typos while preserving casing & surrounding punctuation ──
export function autocorrectWord(word: string): string {
  if (!word.trim()) return word;
  const clean = cleanWord(word);
  const lowerBase = clean.base.toLowerCase();
  
  if (COMMON_TYPOS[lowerBase]) {
    let corrected = COMMON_TYPOS[lowerBase];
    if (clean.isCapitalized) {
      corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
    }
    return clean.leading + corrected + clean.trailing;
  }
  return word;
}

// ── Check if a base word is misspelled ──
export function isMisspelled(word: string): boolean {
  if (!word || word.length <= 1) return false;
  // Ignore numbers and code tokens (containing underscores or symbols)
  if (/^[0-9]+$/.test(word) || word.includes("_") || word.includes("$")) return false;
  
  const clean = cleanWord(word);
  const base = clean.base.toLowerCase();
  if (base.length <= 1) return false;
  
  if (!customWordsLoaded) {
    loadCustomWords();
  }
  
  if (DICTIONARY) {
    return !DICTIONARY.has(base) && !customWordsSet.has(base);
  }
  
  return !VOCABULARY.has(base) && !customWordsSet.has(base);
}

// ── Standard Levenshtein Distance Algorithm ──
export function getLevenshteinDistance(a: string, b: string): number {
  const matrix = [];

  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,    // deletion
          matrix[i][j - 1] + 1,    // insertion
          matrix[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return matrix[a.length][b.length];
}

// ── Get Spelling Suggestions using Levenshtein distance ──
export function getSpellingSuggestions(word: string): string[] {
  const clean = cleanWord(word);
  const base = clean.base.toLowerCase();
  if (!base || base.length <= 1) return [];

  const matches: { word: string; distance: number }[] = [];
  
  if (!customWordsLoaded) {
    loadCustomWords();
  }
  
  // Search pool is custom words + loaded dictionary (or static vocabulary fallback)
  const searchPool = DICTIONARY 
    ? new Set([...DICTIONARY, ...customWordsSet]) 
    : new Set([...VOCABULARY, ...customWordsSet]);
  
  // Search through our vocabulary set
  for (const vocabWord of searchPool) {
    // Heuristic optimization: only compare words with close lengths.
    // If first letter matches, allow length difference up to 2. Else allow length difference up to 1.
    const lengthDiff = Math.abs(vocabWord.length - base.length);
    if (vocabWord[0] === base[0]) {
      if (lengthDiff > 2) continue;
    } else {
      if (lengthDiff > 1) continue;
    }
    
    const distance = getLevenshteinDistance(base, vocabWord);
    if (distance <= 2) {
      matches.push({ word: vocabWord, distance });
    }
  }

  // Sort by smallest distance and then by string length similarity
  matches.sort((a, b) => {
    if (a.distance !== b.distance) {
      return a.distance - b.distance;
    }
    return Math.abs(a.word.length - base.length) - Math.abs(b.word.length - base.length);
  });

  // Take top 3 suggestions, restore original capitalization, and deduplicate
  const suggestions = matches.slice(0, 3).map((match) => {
    let finalWord = match.word;
    if (clean.isCapitalized) {
      finalWord = finalWord.charAt(0).toUpperCase() + finalWord.slice(1);
    }
    return finalWord;
  });
  
  return Array.from(new Set(suggestions));
}
