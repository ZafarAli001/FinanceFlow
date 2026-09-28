import { VoiceParsedCommand } from "../validation/schemas";
import { getAccounts } from "../finance/account-service";
import { getCategories } from "../finance/category-service";

function cleanNonFinancialNumbers(text: string): string {
  return text
    // 1. "N days/weeks/months/hours/years ago"
    .replace(/\b\d+\s+(?:days?|weeks?|months?|hours?|years?)\s+ago\b/gi, " ")
    // 2. "in N days/hours/minutes"
    .replace(/\bin\s+\d+\s+(?:days?|hours?|minutes?)\b/gi, " ")
    // 3. Times: "8 pm", "10:30 am", "5 o'clock", "at 8"
    .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm|o'clock)\b/gi, " ")
    .replace(/\bat\s+\d{1,2}(?::\d{2})?\b/gi, " ")
    // 4. Ordinals: "1st", "2nd", "3rd", "15th", "21st", "30th"
    .replace(/\b\d{1,2}(?:st|nd|rd|th)\b/gi, " ")
    // 5. Month + day e.g. "march 15", "15 march"
    .replace(/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}\b/gi, " ")
    .replace(/\b\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/gi, " ")
    // 6. Years: 2020-2035
    .replace(/\b20[2-3]\d\b/g, " ")
    // 7. Quantity items e.g. "2 coffees", "3 burgers", "4 shirts", "2 pizzas", "1 ticket", etc.
    .replace(/\b\d+\s+(?:items?|pieces?|coffees?|cups?|plates?|burgers?|pizzas?|shirts?|pants?|books?|pens?|bottles?|tickets?|people|persons?|nights?|hours?|days?|weeks?|months?|years?|samosas?|drinks?|beers?|units?|boxes?|packets?|litres?|liters?|kg|kilos?|grams?|gm|apples?|bananas?|glasses?|servings?|medicines?|shoes?)\b/gi, " ")
    // 8. Identifiers: "sector 14", "shop 5", "table 4", "room 201", "counter 3"
    .replace(/\b(?:sector|shop|store|table|room|gate|platform|lane|flat|no\.?|number|id|counter)\s+\d+\b/gi, " ")
    // 9. Percentages
    .replace(/\b\d+(?:\.\d+)?\s*(?:%|percent)\b/gi, " ");
}

export function splitVoiceTranscriptIntoSegments(transcript: string): string[] {
  const text = transcript.trim();
  if (!text) return [];

  // Don't split analytics/balance queries
  const lower = text.toLowerCase();
  if (
    lower.startsWith("how much") ||
    lower.startsWith("what is") ||
    lower.startsWith("what's") ||
    lower.startsWith("what was") ||
    lower.includes("balance") ||
    lower.includes("how much spent")
  ) {
    return [text];
  }

  // Normalize numbers with commas e.g. "1,500" -> "1500"
  const normalized = text.replace(/(\d),(\d)/g, "$1$2");

  // Check how many valid financial amounts exist in the text after filtering non-financial numbers
  const cleanedForAmounts = cleanNonFinancialNumbers(normalized);
  const amountPattern = /(?:₹|\$|rs\.?|rupees?\s*)?\s*(\b\d+(?:\.\d+)?\b)/gi;
  const allAmounts = cleanedForAmounts.match(amountPattern) || [];

  // If there's at most one true financial amount, it's strictly a single transaction!
  if (allAmounts.length <= 1) {
    return [text];
  }

  // Only split on explicit conjunctions or list punctuation
  const delimiterRegex = /\s+(?:and\s+then|and\s+also|and\s+another|then|also|and|\+)\s+|[;\n]+|(?<=[a-zA-Z0-9])\s*,\s*(?=(?:spent|paid|bought|received|got|transfer|\d+))/i;
  
  if (!delimiterRegex.test(normalized)) {
    return [text];
  }

  const rawSegments = normalized
    .split(delimiterRegex)
    .map((s) => s.trim())
    .filter(Boolean);

  if (rawSegments.length <= 1) {
    return [text];
  }

  // Validate that each candidate segment has a genuine amount
  const validSegments: string[] = [];
  let currentBuffer = "";

  for (const seg of rawSegments) {
    const segCleaned = cleanNonFinancialNumbers(seg);
    const hasAmount = Boolean(segCleaned.match(amountPattern));
    if (hasAmount) {
      if (currentBuffer) {
        validSegments.push(currentBuffer);
        currentBuffer = "";
      }
      validSegments.push(seg);
    } else {
      if (validSegments.length > 0) {
        validSegments[validSegments.length - 1] += ` and ${seg}`;
      } else {
        currentBuffer = currentBuffer ? `${currentBuffer} ${seg}` : seg;
      }
    }
  }

  if (currentBuffer) {
    if (validSegments.length > 0) {
      validSegments[0] = `${currentBuffer} ${validSegments[0]}`;
    } else {
      validSegments.push(currentBuffer);
    }
  }

  // If after splitting we don't have at least two segments with amounts, return original
  return validSegments.length > 1 ? validSegments : [text];
}

export async function parseMultipleVoiceTranscripts(
  userId: string,
  transcript: string,
  contextAccountId?: string
): Promise<VoiceParsedCommand[]> {
  const segments = splitVoiceTranscriptIntoSegments(transcript);
  if (segments.length <= 1) {
    const single = await parseVoiceTranscript(userId, transcript, contextAccountId);
    return [single];
  }

  const commands = await Promise.all(
    segments.map((seg) => parseVoiceTranscript(userId, seg, contextAccountId))
  );

  // Deduplicate conflicting identical parsed commands
  const uniqueCommands: VoiceParsedCommand[] = [];
  for (const cmd of commands) {
    const isDup = uniqueCommands.some(
      (existing) =>
        existing.amount === cmd.amount &&
        existing.type === cmd.type &&
        existing.category === cmd.category &&
        existing.account === cmd.account
    );
    if (!isDup) {
      uniqueCommands.push(cmd);
    }
  }

  return uniqueCommands.length > 0 ? uniqueCommands : commands;
}

export async function parseVoiceTranscript(
  userId: string,
  transcript: string,
  contextAccountId?: string
): Promise<VoiceParsedCommand> {
  const text = transcript.trim().toLowerCase();
  
  const userAccounts = await getAccounts(userId);
  const userCategories = await getCategories(userId);

  // Default fallback account
  const defaultAccount = userAccounts.find((a) => a.isDefault) || userAccounts[0];

  // 1. Detect Query Intent
  if (
    text.startsWith("how much") ||
    text.startsWith("what is my") ||
    text.startsWith("what's my") ||
    text.startsWith("what was my") ||
    text.includes("balance") ||
    text.includes("how much spent") ||
    text.includes("how much did i spend")
  ) {
    return parseVoiceQueryIntent(text, userAccounts, userCategories);
  }

  // 2. Detect Transfer Intent
  if (
    text.includes("transfer") ||
    text.includes("moved ") ||
    text.includes("sent ") ||
    (text.includes("from ") && text.includes("to "))
  ) {
    return parseTransferIntent(text, userAccounts);
  }

  // 3. Detect Income Intent
  if (
    text.includes("got ") ||
    text.includes("received ") ||
    text.includes("salary") ||
    text.includes("credited") ||
    text.includes("earned") ||
    text.includes("income")
  ) {
    return parseIncomeIntent(text, userAccounts, userCategories, defaultAccount);
  }

  // 4. Default: Expense Intent
  return parseExpenseIntent(text, userAccounts, userCategories, defaultAccount, contextAccountId);
}

function extractAmount(text: string): number | null {
  const amountRegex = /(?:₹|\$|rs\.?|rupees?\s*)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:rs|rupees)?/i;
  
  // First attempt on text with dates/quantities stripped to prevent picking up e.g. "2" from "2 days ago"
  const cleaned = cleanNonFinancialNumbers(text);
  const match = cleaned.match(amountRegex);
  if (match) {
    const rawNum = match[1].replace(/,/g, "");
    const parsed = parseFloat(rawNum);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // Fallback to raw text if no amount was found
  const rawMatch = text.match(amountRegex);
  if (rawMatch) {
    const rawNum = rawMatch[1].replace(/,/g, "");
    const parsed = parseFloat(rawNum);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function extractDate(text: string): { dateStr: string; label: string } {
  const now = new Date();
  const lower = text.toLowerCase();

  // 1. Relative keywords
  if (lower.includes("day before yesterday")) {
    const d = new Date(now);
    d.setDate(d.getDate() - 2);
    return { dateStr: d.toISOString().split("T")[0], label: "Day before yesterday" };
  }
  if (lower.includes("yesterday") || lower.includes("last night")) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return { dateStr: d.toISOString().split("T")[0], label: "Yesterday" };
  }
  if (lower.includes("today") || lower.includes("this morning") || lower.includes("tonight")) {
    return { dateStr: now.toISOString().split("T")[0], label: "Today" };
  }

  // 2. "N days ago" or "a week ago"
  const daysAgoMatch = lower.match(/(\d+)\s+days?\s+ago/);
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1], 10);
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return { dateStr: d.toISOString().split("T")[0], label: `${days} days ago` };
  }
  if (lower.includes("a week ago") || lower.includes("one week ago") || lower.includes("last week")) {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return { dateStr: d.toISOString().split("T")[0], label: "1 week ago" };
  }

  // 3. Days of the week (e.g. "on monday", "last friday", "this tuesday")
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  for (let targetDay = 0; targetDay < dayNames.length; targetDay++) {
    const dayName = dayNames[targetDay];
    const regex = new RegExp(`(?:on\\s+|last\\s+|this\\s+)?\\b${dayName}\\b`, "i");
    if (regex.test(lower)) {
      const currentDay = now.getDay();
      let diff = currentDay - targetDay;
      if (diff <= 0) diff += 7;
      if (lower.includes("last " + dayName)) {
        diff = diff === 0 ? 7 : diff;
      }
      const d = new Date(now);
      d.setDate(d.getDate() - diff);
      const capName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      return { dateStr: d.toISOString().split("T")[0], label: `Last ${capName}` };
    }
  }

  // 4. Specific Month and Day: e.g. "15th march", "march 15", "25th of december"
  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];
  const monthShorts = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

  for (let m = 0; m < 12; m++) {
    const mFull = monthNames[m];
    const mShort = monthShorts[m];
    const mRegex = new RegExp(`(?:(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(?:${mFull}|${mShort})|(?:${mFull}|${mShort})\\s+(\\d{1,2})(?:st|nd|rd|th)?)`, "i");
    const match = lower.match(mRegex);
    if (match) {
      const day = parseInt(match[1] || match[2], 10);
      if (day >= 1 && day <= 31) {
        let year = now.getFullYear();
        const candidate = new Date(year, m, day);
        if (candidate > now) {
          candidate.setFullYear(year - 1);
        }
        const yyyy = candidate.getFullYear();
        const mm = String(candidate.getMonth() + 1).padStart(2, "0");
        const dd = String(candidate.getDate()).padStart(2, "0");
        return { dateStr: `${yyyy}-${mm}-${dd}`, label: `${day} ${mFull.slice(0, 3)}` };
      }
    }
  }

  return { dateStr: now.toISOString().split("T")[0], label: "Today" };
}

function findMatchingAccount(text: string, userAccounts: any[]) {
  for (const acc of userAccounts) {
    const accName = acc.name.toLowerCase();
    if (text.includes(accName)) return acc;
  }
  for (const acc of userAccounts) {
    const parts = acc.name.toLowerCase().split(/\s+/);
    for (const part of parts) {
      if (part.length > 2 && text.includes(part)) return acc;
    }
  }
  return null;
}

function findMatchingCategory(
  text: string,
  categories: any[],
  defaultType: "EXPENSE" | "INCOME"
): { category: any | null; isExplicitMatch: boolean } {
  const filtered = categories.filter((c) => c.type === defaultType);
  const lower = text.toLowerCase();

  // 1. Direct name match or substring
  for (const cat of filtered) {
    const catName = cat.name.toLowerCase();
    if (lower.includes(catName) || catName.includes(lower)) {
      return { category: cat, isExplicitMatch: true };
    }
  }

  // 2. Comprehensive synonyms and contextual keywords
  const keywordMap: Record<string, string[]> = {
    Dining: ["dinner", "lunch", "breakfast", "restaurant", "swiggy", "zomato", "cafe", "coffee", "food", "tea", "chai", "snack", "snacks", "burger", "pizza", "biryani", "starbucks", "mcdonalds", "kfc", "domino", "bakery", "cake", "drinks", "bar", "pub", "meal", "eating", "bistro", "takeout", "dine", "subway", "dessert", "canteen", "ice cream", "icecream"],
    Food: ["dinner", "lunch", "breakfast", "restaurant", "swiggy", "zomato", "cafe", "coffee", "food", "tea", "chai", "snack", "snacks", "burger", "pizza", "biryani", "starbucks", "mcdonalds", "kfc", "domino", "bakery", "cake", "drinks", "bar", "pub", "meal", "eating", "bistro", "takeout", "dine", "subway", "dessert", "canteen", "ice cream", "icecream"],
    Groceries: ["supermarket", "groceries", "grocery", "veggies", "vegetables", "fruits", "milk", "curd", "bread", "eggs", "meat", "chicken", "mutton", "fish", "mart", "ration", "provisions", "blinkit", "zepto", "instamart", "bigbasket", "dmall", "dmart", "rice", "atta", "oil", "daily needs", "kirana", "household"],
    Shopping: ["store", "shop", "clothes", "clothing", "cloth", "shirt", "jeans", "pants", "dress", "shoes", "footwear", "mall", "market", "purchase", "bought", "amazon", "flipkart", "myntra", "zara", "h&m", "meesho", "electronics", "phone", "laptop", "gadget", "watch", "bag", "order", "boutique", "retail", "apparel"],
    Transport: ["cab", "taxi", "uber", "ola", "auto", "rickshaw", "metro", "bus", "train", "ticket", "toll", "rapid", "rapido", "ride", "fare", "flight", "plane", "parking", "transit", "airline"],
    Fuel: ["petrol", "diesel", "gas", "cng", "fuel", "indian oil", "bharat petroleum", "hp petrol", "shell", "gas station", "fuel pump"],
    Bills: ["electricity", "water", "recharge", "wifi", "internet", "phone bill", "mobile", "dth", "broadband", "power", "cylinder", "gas bill", "utility", "utilities", "bill", "dues"],
    Utilities: ["electricity", "water", "recharge", "wifi", "internet", "power", "gas", "broadband", "utility", "utilities"],
    Rent: ["house rent", "room rent", "rent", "pg", "flat rent", "maintenance", "society", "landlord"],
    Entertainment: ["movie", "cinema", "netflix", "game", "games", "gaming", "concert", "hotstar", "spotify", "prime", "theatre", "pvr", "inox", "show", "entertainment"],
    Healthcare: ["doctor", "medicine", "medicines", "pharmacy", "hospital", "clinic", "medical", "dentist", "pills", "apollo", "1mg", "tests", "health", "healthcare"],
    Education: ["school", "college", "tuition", "fees", "course", "udemy", "book", "books", "stationery", "exam", "classes", "education"],
    Travel: ["hotel", "trip", "vacation", "holiday", "tour", "airbnb", "resort", "travel"],
    Personal: ["salon", "parlour", "haircut", "spa", "cosmetics", "gym", "fitness", "personal", "skincare"],
    Subscription: ["subscription", "subscriptions", "membership", "premium"],
    Salary: ["paycheck", "salary", "stipend", "wages", "bonus"],
    Freelance: ["client", "upwork", "fiverr", "freelance", "contract"],
    Investment: ["stocks", "crypto", "mutual fund", "sip", "dividend", "investment"],
    Cashback: ["cashback", "reward", "rewards"],
    Gift: ["gift", "donation", "charity", "present"],
    Refund: ["refund", "reimbursement"],
  };

  for (const [targetName, keywords] of Object.entries(keywordMap)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        const found = filtered.find(
          (c) =>
            c.name.toLowerCase() === targetName.toLowerCase() ||
            c.name.toLowerCase().includes(targetName.toLowerCase()) ||
            targetName.toLowerCase().includes(c.name.toLowerCase())
        );
        if (found) return { category: found, isExplicitMatch: true };
      }
    }
  }

  // 3. Fallback heuristic guessing based on generic intent words
  if (lower.includes("store") || lower.includes("shop") || lower.includes("bought")) {
    const shoppingCat = filtered.find((c) => /shopping/i.test(c.name));
    if (shoppingCat) return { category: shoppingCat, isExplicitMatch: true };
  }

  if (lower.includes("food") || lower.includes("eat") || lower.includes("dine") || lower.includes("drink")) {
    const foodCat = filtered.find((c) => /dining|food/i.test(c.name));
    if (foodCat) return { category: foodCat, isExplicitMatch: true };
  }

  // Safe fallback to 'Other' or first available category - NEVER leave empty
  const fallback = filtered.find((c) => c.name.toLowerCase() === "other") || filtered[0] || null;
  return { category: fallback, isExplicitMatch: true };
}

function parseExpenseIntent(
  text: string,
  userAccounts: any[],
  categories: any[],
  defaultAccount: any,
  contextAccountId?: string
): VoiceParsedCommand {
  const amount = extractAmount(text);
  const matchedAccount = findMatchingAccount(text, userAccounts) ||
    (contextAccountId ? userAccounts.find((a) => a.id === contextAccountId) : defaultAccount);

  const { category: matchedCategory } = findMatchingCategory(text, categories, "EXPENSE");
  const { dateStr } = extractDate(text);

  let description = text
    .replace(/(?:i\s+)?spent\s+/g, "")
    .replace(/(?:i\s+)?paid\s+/g, "")
    .replace(/(?:bought|purchased)\s+/g, "")
    .replace(/for\s+/g, "")
    .replace(/on\s+/g, "")
    .replace(/using\s+[\w\s]+/g, "")
    .replace(/with\s+[\w\s]+/g, "")
    .replace(/(?:day\s+before\s+yesterday|yesterday|today|last\s+night|this\s+morning)/g, "")
    .replace(/(?:\d+\s+days?\s+ago|a\s+week\s+ago|last\s+week)/g, "")
    .replace(/(?:on|last|this)?\s*(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)/g, "")
    .replace(/\d+/g, "")
    .replace(/₹|\$|rs|rupees/g, "")
    .trim();

  if (!description) description = matchedCategory ? matchedCategory.name : "Expense";
  description = description.charAt(0).toUpperCase() + description.slice(1);

  // If amount is missing, clarify only amount
  if (!amount) {
    return {
      intent: "AMBIGUOUS",
      type: "EXPENSE",
      currency: matchedAccount?.currency || "INR",
      account: matchedAccount?.name,
      category: matchedCategory?.name,
      confidence: 0.4,
      clarificationQuestion: `How much did you spend on ${description || "this transaction"}?`,
      missingFields: ["amount"],
    };
  }

  // Assistant guesses category himself - NO category clarification asked!
  return {
    intent: "ADD_EXPENSE",
    type: "EXPENSE",
    amount,
    currency: matchedAccount?.currency || "INR",
    account: matchedAccount?.name,
    category: matchedCategory?.name,
    description,
    date: dateStr,
    confidence: 0.95,
  };
}

function parseIncomeIntent(
  text: string,
  userAccounts: any[],
  categories: any[],
  defaultAccount: any
): VoiceParsedCommand {
  const amount = extractAmount(text);
  const matchedAccount = findMatchingAccount(text, userAccounts) || defaultAccount;
  const { category: matchedCategory } = findMatchingCategory(text, categories, "INCOME");
  const { dateStr } = extractDate(text);

  let description = "Income";
  if (text.includes("salary")) description = "Salary";
  else if (text.includes("freelance")) description = "Freelance Work";
  else if (text.includes("refund")) description = "Refund";
  else if (text.includes("gift")) description = "Gift";

  if (!amount) {
    return {
      intent: "AMBIGUOUS",
      type: "INCOME",
      currency: matchedAccount?.currency || "INR",
      account: matchedAccount?.name,
      category: matchedCategory?.name,
      confidence: 0.4,
      clarificationQuestion: "How much income did you receive?",
      missingFields: ["amount"],
    };
  }

  // Assistant guesses income category himself - NO category clarification asked!
  return {
    intent: "ADD_INCOME",
    type: "INCOME",
    amount,
    currency: matchedAccount?.currency || "INR",
    account: matchedAccount?.name,
    category: matchedCategory?.name,
    description,
    date: dateStr,
    confidence: 0.95,
  };
}

function parseTransferIntent(text: string, userAccounts: any[]): VoiceParsedCommand {
  const amount = extractAmount(text);
  const { dateStr } = extractDate(text);

  let sourceAcc: any = null;
  let destAcc: any = null;

  const fromToMatch = text.match(/from\s+([a-z0-9\s]+?)\s+to\s+([a-z0-9\s]+)/i);
  if (fromToMatch) {
    sourceAcc = findMatchingAccount(fromToMatch[1], userAccounts);
    destAcc = findMatchingAccount(fromToMatch[2], userAccounts);
  } else {
    for (const acc of userAccounts) {
      if (text.includes(acc.name.toLowerCase())) {
        if (!sourceAcc) sourceAcc = acc;
        else if (!destAcc && acc.id !== sourceAcc.id) destAcc = acc;
      }
    }
  }

  if (!amount) {
    return {
      intent: "AMBIGUOUS",
      type: "TRANSFER",
      currency: sourceAcc?.currency || "INR",
      sourceAccount: sourceAcc?.name,
      destinationAccount: destAcc?.name,
      confidence: 0.4,
      clarificationQuestion: "How much would you like to transfer?",
      missingFields: ["amount"],
    };
  }

  if (!sourceAcc || !destAcc) {
    return {
      intent: "AMBIGUOUS",
      type: "TRANSFER",
      amount,
      currency: sourceAcc?.currency || "INR",
      sourceAccount: sourceAcc?.name,
      destinationAccount: destAcc?.name,
      confidence: 0.5,
      clarificationQuestion: !sourceAcc
        ? "Which account are you transferring money FROM?"
        : "Which account are you transferring money TO?",
      missingFields: !sourceAcc ? ["sourceAccount"] : ["destinationAccount"],
    };
  }

  return {
    intent: "TRANSFER",
    type: "TRANSFER",
    amount,
    currency: sourceAcc.currency || "INR",
    sourceAccount: sourceAcc.name,
    destinationAccount: destAcc.name,
    description: `Transfer from ${sourceAcc.name} to ${destAcc.name}`,
    date: dateStr,
    confidence: 0.95,
  };
}

function parseVoiceQueryIntent(
  text: string,
  userAccounts: any[],
  categories: any[]
): VoiceParsedCommand {
  if (text.includes("balance")) {
    const acc = findMatchingAccount(text, userAccounts);
    return {
      intent: "QUERY_BALANCE",
      currency: acc?.currency || "INR",
      account: acc ? acc.name : undefined,
      confidence: 0.9,
    };
  }

  if (text.includes("food") || text.includes("groceries") || text.includes("dining")) {
    return {
      intent: "QUERY_EXPENSES",
      currency: "INR",
      category: "Food",
      confidence: 0.9,
    };
  }

  if (text.includes("biggest") || text.includes("largest") || text.includes("highest")) {
    return {
      intent: "QUERY_ANALYTICS",
      currency: "INR",
      description: "highest_expense",
      confidence: 0.9,
    };
  }

  return {
    intent: "QUERY_EXPENSES",
    currency: "INR",
    date: text.includes("today") ? "today" : "month",
    confidence: 0.85,
  };
}
