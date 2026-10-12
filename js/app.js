(() => {
  const KEY = "smart-kitchen.pwa.v1";
  const AUTH = "smart-kitchen.pwa.auth";

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  function loadState() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {
      inventory: KitchenSeed.sampleInventory(),
      recipes: KitchenSeed.recipes.map((r) => ({ ...r })),
      mealPlan: [],
      shopping: [],
      profile: { allergies: [] },
    };
  }

  let state = loadState();
  const save = () => localStorage.setItem(KEY, JSON.stringify(state));

  function daysUntil(iso) {
    if (!iso) return 999;
    const a = new Date();
    a.setHours(0, 0, 0, 0);
    const b = new Date(iso + "T00:00:00");
    return Math.round((b - a) / 86400000);
  }

  function isExpiring(item) {
    const d = daysUntil(item.expiry);
    return d >= 0 && d <= 3;
  }
  function isExpired(item) {
    return item.expiry && daysUntil(item.expiry) < 0;
  }

  function invQty(name) {
    return state.inventory
      .filter((i) => i.name === name)
      .reduce((s, i) => s + Number(i.qty || 0), 0);
  }

  function isStaple(name) {
    return KitchenSeed.staples.has(name);
  }

  function recipeMatch(recipe, selectedNames, selectedMethods) {
    if (selectedMethods.size) {
      if (!recipe.methods.some((m) => selectedMethods.has(m))) return null;
    }
    const have = [];
    const miss = [];
    for (const ing of recipe.ingredients) {
      if (isStaple(ing.name)) {
        have.push(ing);
        continue;
      }
      if (invQty(ing.name) > 0) have.push(ing);
      else miss.push(ing);
    }
    if (selectedNames.size) {
      const names = new Set(recipe.ingredients.map((i) => i.name));
      let hit = 0;
      selectedNames.forEach((n) => {
        if (names.has(n)) hit++;
      });
      if (!hit) return null;
    }
    const usesExpiring = recipe.ingredients.some((ing) =>
      state.inventory.some((i) => i.name === ing.name && isExpiring(i))
    );
    const score = have.length / Math.max(recipe.ingredients.length, 1) + (usesExpiring ? 0.15 : 0);
    return { recipe, have, miss, score, usesExpiring };
  }

  // —— Auth ——
  function isAuthed() {
    return sessionStorage.getItem(AUTH) === "1";
  }
  function showApp(on) {
    $("#loginView").classList.toggle("hidden", on);
    $("#appView").classList.toggle("hidden", !on);
  }

  $("#loginForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const pw = $("#password").value.trim();
    const expected = localStorage.getItem("smart-kitchen.password") || KitchenSeed.passwordDefault;
    if (pw === expected) {
      sessionStorage.setItem(AUTH, "1");
      showApp(true);
      renderAll();
    } else {
      $("#loginError").textContent = "密码不正确";
      $("#loginError").classList.remove("hidden");
    }
  });

  $("#logoutBtn")?.addEventListener("click", () => {
    sessionStorage.removeItem(AUTH);
    showApp(false);
  });

  // —— Tabs ——
  $$(".tabbar button").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".tabbar button").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
      $$(".page").forEach((p) => p.classList.remove("active"));
      $(`#page-${btn.dataset.tab}`).classList.add("active");
      $("#pageTitle").textContent = btn.dataset.label;
      renderAll();
    });
  });

  // —— Inventory ——
  function renderInventory() {
    const list = $("#invList");
    const expiring = state.inventory.filter((i) => isExpiring(i) || isExpired(i));
    const banner = $("#expiryBanner");
    if (expiring.length) {
      banner.classList.remove("hidden");
      banner.innerHTML =
        `<strong>临期提醒</strong>：` +
        expiring
          .map((i) => `${i.name}${isExpired(i) ? "（已过期）" : `（${daysUntil(i.expiry)}天）`}`)
          .join("、") +
        ` <button type="button" class="btn btn-sm" id="goRecommendExpiring">优先推荐消耗</button>`;
      $("#goRecommendExpiring")?.addEventListener("click", () => {
        $$(".tabbar button").find((b) => b.dataset.tab === "cook")?.click();
      });
    } else {
      banner.classList.add("hidden");
    }

    const locs = ["冷藏", "冷冻", "室外"];
    list.innerHTML = locs
      .map((loc) => {
        const items = state.inventory.filter((i) => i.location === loc);
        return `<div class="section-title">${loc}（${items.length}）</div>` +
          (items.length
            ? items
                .map(
                  (i) => `<div class="card" data-id="${i.id}">
              <div class="row">
                <div>
                  <h3>${escapeHtml(i.name)}</h3>
                  <div class="meta">${i.qty} ${i.unit}${i.expiry ? ` · 过期 ${i.expiry}` : ""}${i.price ? ` · ¥${i.price}` : ""}</div>
                </div>
                <button type="button" class="btn btn-sm btn-ghost inv-del" data-id="${i.id}">删</button>
              </div>
            </div>`
                )
                .join("")
            : `<p class="empty" style="padding:0.5rem 0">空</p>`);
      })
      .join("");

    list.querySelectorAll(".inv-del").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.inventory = state.inventory.filter((i) => i.id !== btn.dataset.id);
        save();
        renderInventory();
      });
    });
  }

  $("#addInvBtn")?.addEventListener("click", () => openInvSheet());
  $("#scanInvBtn")?.addEventListener("click", () => openScanSheet());

  function openInvSheet(item) {
    const sheet = $("#sheet");
    sheet.classList.remove("hidden");
    $("#sheetBody").innerHTML = `
      <h2>${item ? "编辑食材" : "添加食材"}</h2>
      <div class="field"><label>名称</label><input id="f-name" value="${item?.name || ""}" /></div>
      <div class="field"><label>数量</label><input id="f-qty" type="number" step="any" value="${item?.qty ?? 1}" /></div>
      <div class="field"><label>单位</label><input id="f-unit" value="${item?.unit || "个"}" /></div>
      <div class="field"><label>位置</label>
        <select id="f-loc">
          ${["冷藏", "冷冻", "室外"].map((l) => `<option ${item?.location === l ? "selected" : ""}>${l}</option>`).join("")}
        </select>
      </div>
      <div class="field"><label>购买日期</label><input id="f-bought" type="date" value="${item?.bought || ""}" /></div>
      <div class="field"><label>过期日期</label><input id="f-expiry" type="date" value="${item?.expiry || ""}" /></div>
      <div class="field"><label>价格（可选）</label><input id="f-price" value="${item?.price || ""}" /></div>
      <div class="field"><label>购买平台（可选）</label><input id="f-platform" value="${item?.platform || ""}" /></div>
      <button type="button" class="btn" id="saveInv">确认入库</button>
      <button type="button" class="btn btn-ghost" id="closeSheet" style="margin-top:0.5rem">取消</button>
    `;
    $("#closeSheet").onclick = () => sheet.classList.add("hidden");
    $("#saveInv").onclick = () => {
      const row = {
        id: item?.id || crypto.randomUUID(),
        name: $("#f-name").value.trim(),
        qty: Number($("#f-qty").value) || 0,
        unit: $("#f-unit").value.trim() || "个",
        location: $("#f-loc").value,
        bought: $("#f-bought").value,
        expiry: $("#f-expiry").value,
        price: $("#f-price").value.trim(),
        platform: $("#f-platform").value.trim(),
      };
      if (!row.name) return;
      const idx = state.inventory.findIndex((i) => i.id === row.id);
      if (idx >= 0) state.inventory[idx] = row;
      else state.inventory.unshift(row);
      save();
      sheet.classList.add("hidden");
      renderInventory();
    };
  }

  function openScanSheet() {
    const sheet = $("#sheet");
    sheet.classList.remove("hidden");
    const samples = [
      { name: "牛奶", text: "牛奶 Milk EXP " + datePlus(2) },
      { name: "鸡蛋", text: "鸡蛋 Egg Best before " + datePlus(1) },
      { name: "酸奶", text: "酸奶 保质期至 " + datePlus(-1) },
    ];
    $("#sheetBody").innerHTML = `
      <h2>拍照 / 识别（演示）</h2>
      <p class="meta">选择照片后可粘贴包装文字；或点预设样品。识别结果需确认再入库。</p>
      <div class="field"><label>照片</label><input type="file" id="f-photo" accept="image/*" capture="environment" /></div>
      <div class="field"><label>包装文字</label><textarea id="f-ocr" rows="4" placeholder="粘贴 OCR / 包装文字"></textarea></div>
      <button type="button" class="btn" id="parseScan">识别并进入确认</button>
      <div class="section-title">快速样品</div>
      ${samples.map((s, i) => `<button type="button" class="btn btn-ghost sample-btn" data-i="${i}" style="margin-bottom:0.4rem">${s.name}</button>`).join("")}
      <button type="button" class="btn btn-ghost" id="closeSheet" style="margin-top:0.5rem">取消</button>
    `;
    $("#closeSheet").onclick = () => sheet.classList.add("hidden");
    $$(".sample-btn").forEach((b) => {
      b.onclick = () => {
        $("#f-ocr").value = samples[Number(b.dataset.i)].text;
      };
    });
    $("#parseScan").onclick = () => {
      const text = $("#f-ocr").value.trim();
      if (!text) return;
      const found = KitchenSeed.recipes
        .flatMap((r) => r.ingredients.map((i) => i.name))
        .concat(["牛奶", "酸奶", "鸡蛋", "番茄", "豆腐"])
        .find((n) => text.includes(n));
      const expiryMatch = text.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
      let expiry = "";
      if (expiryMatch) {
        expiry = `${expiryMatch[1]}-${expiryMatch[2].padStart(2, "0")}-${expiryMatch[3].padStart(2, "0")}`;
      } else if (text.includes("明天") || /before/i.test(text)) {
        expiry = datePlus(1);
      }
      sheet.classList.add("hidden");
      openInvSheet({
        name: found || text.slice(0, 12),
        qty: 1,
        unit: "个",
        location: "冷藏",
        bought: datePlus(0),
        expiry,
        price: "",
        platform: "",
      });
    };
  }

  function datePlus(n) {
    const x = new Date();
    x.setDate(x.getDate() + n);
    return x.toISOString().slice(0, 10);
  }

  // —— Recipes ——
  function renderRecipes() {
    const q = ($("#recipeSearch")?.value || "").trim();
    const list = state.recipes.filter((r) => !q || r.name.includes(q) || r.tags.some((t) => t.includes(q)));
    $("#recipeList").innerHTML = list
      .map(
        (r) => `<div class="card">
        <div class="row">
          <div>
            <h3>${escapeHtml(r.name)}</h3>
            <div class="meta">${r.minutes} 分钟 · ${r.methods.join("/")} · ${r.source === "ai" ? "AI 生成" : "个人"}</div>
            <div class="tags">${r.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
              ${r.kcal ? `<span class="tag">约 ${r.kcal} kcal/份（估算）</span>` : ""}</div>
          </div>
        </div>
        <div class="meta" style="margin-top:0.5rem">${r.ingredients.map((i) => `${i.name}${i.qty}${i.unit}`).join(" · ")}</div>
        <div style="margin-top:0.65rem;display:flex;gap:0.4rem;flex-wrap:wrap">
          <button type="button" class="btn btn-sm btn-ghost add-plan" data-id="${r.id}">加入周计划</button>
          <button type="button" class="btn btn-sm cook-now" data-id="${r.id}">做完并扣库存</button>
        </div>
      </div>`
      )
      .join("") || `<p class="empty">暂无菜谱</p>`;

    $$(".add-plan").forEach((b) => {
      b.onclick = () => {
        state.mealPlan.push({
          id: crypto.randomUUID(),
          date: datePlus(0),
          meal: "晚餐",
          recipeId: b.dataset.id,
          servings: 1,
        });
        save();
        alert("已加入今日晚餐计划");
      };
    });
    $$(".cook-now").forEach((b) => {
      b.onclick = () => {
        const recipe = state.recipes.find((r) => r.id === b.dataset.id);
        if (!recipe) return;
        for (const ing of recipe.ingredients) {
          if (isStaple(ing.name)) continue;
          const item = state.inventory.find((i) => i.name === ing.name);
          if (item) {
            item.qty = Math.max(0, Number(item.qty) - Number(ing.qty));
            if (item.qty <= 0.001) state.inventory = state.inventory.filter((x) => x.id !== item.id);
          }
        }
        save();
        renderAll();
        alert("已按菜谱扣减库存");
      };
    });
  }

  $("#recipeSearch")?.addEventListener("input", renderRecipes);
  $("#importRecipeBtn")?.addEventListener("click", () => {
    const sheet = $("#sheet");
    sheet.classList.remove("hidden");
    $("#sheetBody").innerHTML = `
      <h2>导入菜谱</h2>
      <p class="meta">粘贴网页链接或任意文字（含小红书文案）。演示版用本地规则整理，正式版接 AI。</p>
      <div class="field"><label>链接（可选外链）</label><input id="f-url" placeholder="https://..." /></div>
      <div class="field"><label>文字</label><textarea id="f-text" rows="6" placeholder="菜名&#10;材料：...&#10;步骤：..."></textarea></div>
      <button type="button" class="btn" id="doImport">整理并预览保存</button>
      <button type="button" class="btn btn-ghost" id="closeSheet" style="margin-top:0.5rem">取消</button>
    `;
    $("#closeSheet").onclick = () => sheet.classList.add("hidden");
    $("#doImport").onclick = () => {
      const text = $("#f-text").value.trim();
      const url = $("#f-url").value.trim();
      if (!text && !url) return;
      const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
      const name = lines[0] || "导入菜谱";
      const recipe = {
        id: crypto.randomUUID(),
        name,
        source: url ? "link" : "text",
        link: url || "",
        methods: ["炒"],
        minutes: 30,
        tags: ["导入"],
        kcal: null,
        ingredients: [{ name: "适量食材", qty: 1, unit: "份" }],
        steps: lines.slice(1).length ? lines.slice(1) : ["请编辑完善步骤"],
      };
      // try pull known ingredient names
      const known = ["鸡蛋", "番茄", "豆腐", "牛肉", "土豆", "西兰花", "面条", "牛奶", "大蒜", "洋葱"];
      const found = known.filter((n) => text.includes(n)).map((n) => ({ name: n, qty: 1, unit: "份" }));
      if (found.length) recipe.ingredients = found;
      state.recipes.unshift(recipe);
      save();
      sheet.classList.add("hidden");
      renderRecipes();
    };
  });

  // —— Recommend ——
  let selIng = new Set();
  let selMethod = new Set();

  function renderCook() {
    const names = [...new Set(state.inventory.map((i) => i.name))];
    const methods = [...new Set(state.recipes.flatMap((r) => r.methods))];
    $("#ingChips").innerHTML = names
      .map((n) => `<button type="button" class="chip ${selIng.has(n) ? "on" : ""}" data-n="${escapeHtml(n)}">${escapeHtml(n)}</button>`)
      .join("") || `<span class="meta">先在「库存」添加食材</span>`;
    $("#methodChips").innerHTML = methods
      .map((m) => `<button type="button" class="chip ${selMethod.has(m) ? "on" : ""}" data-m="${escapeHtml(m)}">${escapeHtml(m)}</button>`)
      .join("");

    $$("#ingChips .chip").forEach((c) => {
      c.onclick = () => {
        const n = c.dataset.n;
        if (selIng.has(n)) selIng.delete(n);
        else selIng.add(n);
        renderCook();
      };
    });
    $$("#methodChips .chip").forEach((c) => {
      c.onclick = () => {
        const m = c.dataset.m;
        if (selMethod.has(m)) selMethod.delete(m);
        else selMethod.add(m);
        renderCook();
      };
    });

    const results = state.recipes
      .map((r) => recipeMatch(r, selIng, selMethod))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    $("#cookResults").innerHTML =
      results
        .map((x) => {
          const missBtns = x.miss
            .filter((i) => !isStaple(i.name))
            .map((i) => `<button type="button" class="btn btn-sm btn-ghost add-miss" data-name="${escapeHtml(i.name)}" data-qty="${i.qty}" data-unit="${escapeHtml(i.unit)}">缺 ${escapeHtml(i.name)} → 清单</button>`)
            .join(" ");
          return `<div class="card">
            <h3>${escapeHtml(x.recipe.name)}</h3>
            <div class="meta">${x.recipe.minutes} 分钟 · 匹配 ${Math.round(Math.min(x.score, 1) * 100)}%</div>
            <div class="tags">
              ${x.have.slice(0, 6).map((i) => `<span class="tag">已有 ${escapeHtml(i.name)}</span>`).join("")}
              ${x.miss.filter((i) => !isStaple(i.name)).map((i) => `<span class="tag miss">缺少 ${escapeHtml(i.name)}</span>`).join("")}
              ${x.usesExpiring ? `<span class="tag warn">消耗临期</span>` : ""}
            </div>
            <div style="margin-top:0.6rem;display:flex;flex-wrap:wrap;gap:0.35rem">${missBtns}</div>
          </div>`;
        })
        .join("") || `<p class="empty">没有匹配，试试放宽筛选</p>`;

    $$(".add-miss").forEach((b) => {
      b.onclick = () => {
        state.shopping.push({
          id: crypto.randomUUID(),
          name: b.dataset.name,
          need: Number(b.dataset.qty) || 1,
          have: invQty(b.dataset.name),
          buy: Number(b.dataset.qty) || 1,
          unit: b.dataset.unit,
          checked: false,
        });
        save();
        alert("已加入购物清单");
      };
    });
  }

  // —— Plan / Shop ——
  function renderPlan() {
    $("#planList").innerHTML =
      state.mealPlan
        .map((p) => {
          const r = state.recipes.find((x) => x.id === p.recipeId);
          return `<div class="card row">
            <div>
              <h3>${escapeHtml(r?.name || "未知菜谱")}</h3>
              <div class="meta">${p.date} · ${p.meal}</div>
            </div>
            <button type="button" class="btn btn-sm btn-ghost del-plan" data-id="${p.id}">移除</button>
          </div>`;
        })
        .join("") || `<p class="empty">在「菜谱」里把菜加入周计划</p>`;

    $$(".del-plan").forEach((b) => {
      b.onclick = () => {
        state.mealPlan = state.mealPlan.filter((p) => p.id !== b.id);
        // fix: use dataset
      };
    });
    // rebind properly
    $$(".del-plan").forEach((b) => {
      b.onclick = () => {
        state.mealPlan = state.mealPlan.filter((p) => p.id !== b.dataset.id);
        save();
        renderPlan();
      };
    });

    $("#shopList").innerHTML =
      state.shopping
        .map(
          (s) => `<div class="card row">
          <label style="display:flex;gap:0.6rem;align-items:flex-start;flex:1">
            <input type="checkbox" class="shop-check" data-id="${s.id}" ${s.checked ? "checked" : ""} />
            <span>
              <strong>${escapeHtml(s.name)}</strong>
              <div class="meta">待购 ${s.buy} ${escapeHtml(s.unit || "")}</div>
            </span>
          </label>
        </div>`
        )
        .join("") || `<p class="empty">点「从计划生成清单」或从推荐加入缺少项</p>`;

    $$(".shop-check").forEach((c) => {
      c.onchange = () => {
        const item = state.shopping.find((s) => s.id === c.dataset.id);
        if (item) item.checked = c.checked;
        save();
      };
    });
  }

  $("#genShopBtn")?.addEventListener("click", () => {
    const need = new Map();
    for (const p of state.mealPlan) {
      const r = state.recipes.find((x) => x.id === p.recipeId);
      if (!r) continue;
      for (const ing of r.ingredients) {
        if (isStaple(ing.name)) continue;
        const key = ing.name;
        const cur = need.get(key) || { name: ing.name, qty: 0, unit: ing.unit };
        cur.qty += Number(ing.qty) * (p.servings || 1);
        need.set(key, cur);
      }
    }
    const list = [];
    need.forEach((v) => {
      const have = invQty(v.name);
      const buy = Math.max(0, v.qty - have);
      if (buy > 0.001) {
        list.push({
          id: crypto.randomUUID(),
          name: v.name,
          need: v.qty,
          have,
          buy: Math.round(buy * 10) / 10,
          unit: v.unit,
          checked: false,
        });
      }
    });
    state.shopping = list;
    save();
    renderPlan();
  });

  $("#restockBtn")?.addEventListener("click", () => {
    for (const s of state.shopping.filter((x) => x.checked)) {
      state.inventory.unshift({
        id: crypto.randomUUID(),
        name: s.name,
        qty: s.buy,
        unit: s.unit || "个",
        location: "冷藏",
        bought: datePlus(0),
        expiry: "",
        price: "",
        platform: "",
      });
    }
    state.shopping = state.shopping.filter((x) => !x.checked);
    save();
    renderAll();
    alert("已将勾选项入库");
  });

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderAll() {
    renderInventory();
    renderRecipes();
    renderCook();
    renderPlan();
  }

  // Install prompt
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $("#installTip")?.classList.remove("hidden");
  });
  $("#installBtn")?.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    $("#installTip")?.classList.add("hidden");
  });

  // SW
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  // boot
  if (isAuthed()) {
    showApp(true);
    renderAll();
  } else {
    showApp(false);
  }
})();
