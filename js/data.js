/** Seed recipes & helpers — PRD v0.2 personal starter library */
window.KitchenSeed = {
  passwordDefault: "kitchen2026",

  staples: new Set(["盐", "糖", "油", "酱油", "醋", "生抽", "老抽", "料酒"]),

  recipes: [
    {
      id: "r1",
      name: "番茄炒蛋",
      source: "ai",
      methods: ["炒"],
      minutes: 15,
      tags: ["家常"],
      kcal: 190,
      ingredients: [
        { name: "鸡蛋", qty: 3, unit: "个" },
        { name: "番茄", qty: 2, unit: "个" },
        { name: "油", qty: 1, unit: "大勺" },
        { name: "盐", qty: 1, unit: "小勺" },
      ],
      steps: ["鸡蛋打散加少许盐", "滑炒鸡蛋盛出", "炒番茄出汁，倒回鸡蛋调味"],
    },
    {
      id: "r2",
      name: "蒜蓉西兰花",
      source: "ai",
      methods: ["炒", "焯"],
      minutes: 12,
      tags: ["减脂", "家常"],
      kcal: 80,
      ingredients: [
        { name: "西兰花", qty: 300, unit: "g" },
        { name: "大蒜", qty: 3, unit: "瓣" },
        { name: "油", qty: 1, unit: "大勺" },
        { name: "盐", qty: 1, unit: "小勺" },
      ],
      steps: ["西兰花焯水沥干", "蒜末爆香翻炒，加盐"],
    },
    {
      id: "r3",
      name: "土豆炖牛肉（简易）",
      source: "ai",
      methods: ["炖", "一锅"],
      minutes: 50,
      tags: ["家常", "养生"],
      kcal: 320,
      ingredients: [
        { name: "牛肉", qty: 300, unit: "g" },
        { name: "土豆", qty: 2, unit: "个" },
        { name: "洋葱", qty: 0.5, unit: "个" },
        { name: "酱油", qty: 2, unit: "大勺" },
        { name: "盐", qty: 1, unit: "小勺" },
      ],
      steps: ["牛肉焯水", "与土豆洋葱同炖至软烂", "酱油盐调味"],
    },
    {
      id: "r4",
      name: "清炒时蔬豆腐",
      source: "ai",
      methods: ["炒"],
      minutes: 18,
      tags: ["清淡", "减脂"],
      kcal: 150,
      ingredients: [
        { name: "豆腐", qty: 200, unit: "g" },
        { name: "青菜", qty: 200, unit: "g" },
        { name: "大蒜", qty: 2, unit: "瓣" },
        { name: "盐", qty: 1, unit: "小勺" },
      ],
      steps: ["豆腐煎至微黄", "下青菜蒜翻炒调味"],
    },
    {
      id: "r5",
      name: "葱油拌面",
      source: "ai",
      methods: ["煮"],
      minutes: 15,
      tags: ["快手"],
      kcal: 420,
      ingredients: [
        { name: "面条", qty: 180, unit: "g" },
        { name: "小葱", qty: 3, unit: "根" },
        { name: "酱油", qty: 2, unit: "大勺" },
        { name: "油", qty: 2, unit: "大勺" },
      ],
      steps: ["煮面沥干", "油爆葱花倒酱油拌面"],
    },
  ],

  sampleInventory: () => {
    const d = (n) => {
      const x = new Date();
      x.setHours(0, 0, 0, 0);
      x.setDate(x.getDate() + n);
      return x.toISOString().slice(0, 10);
    };
    return [
      { id: crypto.randomUUID(), name: "鸡蛋", qty: 6, unit: "个", location: "冷藏", bought: d(-2), expiry: d(2), price: "", platform: "" },
      { id: crypto.randomUUID(), name: "番茄", qty: 3, unit: "个", location: "冷藏", bought: d(-1), expiry: d(1), price: "", platform: "" },
      { id: crypto.randomUUID(), name: "西兰花", qty: 1, unit: "个", location: "冷藏", bought: d(0), expiry: d(3), price: "", platform: "" },
      { id: crypto.randomUUID(), name: "豆腐", qty: 1, unit: "块", location: "冷藏", bought: d(0), expiry: d(2), price: "", platform: "" },
      { id: crypto.randomUUID(), name: "面条", qty: 400, unit: "g", location: "室外", bought: d(-10), expiry: "", price: "", platform: "" },
      { id: crypto.randomUUID(), name: "酱油", qty: 1, unit: "瓶", location: "室外", bought: d(-30), expiry: "", price: "", platform: "" },
    ];
  },
};
