/* MMM-SchoolLunchMenu
 *
 * Shows today's school lunch (the full menu), flags early-dismissal days, and falls back to
 * the next day that has a lunch when today has none (weekend, closure). The menu lives in
 * config/lunch-menu.json (one entry per date, filled in once a month from the district's PDF).
 * Closures and early-dismissal days are read from config/school-day.json.
 */
Module.register("MMM-SchoolLunchMenu", {
  defaults: {
    timezone: null,
    debugDate: null,
    menuFile: "lunch-menu.json",
    schoolFile: "school-day.json",
    refreshInterval: 10 * 60 * 1000,
    showAlternates: true, // small "also available every day" block under the menu
    lookAheadDays: 7,
  },

  getScripts() {
    return [this.file("date-utils.js")];
  },

  getStyles() {
    return [this.file("MMM-SchoolLunchMenu.css")];
  },

  schedule(fn, ms) {
    this.timers.push(setInterval(fn, ms));
  },
  suspend() {
    (this.timers || []).forEach(clearInterval);
    this.timers = [];
  },
  resume() {
    this.start();
  },

  start() {
    this.suspend();
    this.payload = null;
    this.errorText = null;
    this.lastRaw = null;
    this.renderedDay = null;

    this.requestData();
    this.schedule(() => this.requestData(), this.config.refreshInterval);

    this.schedule(() => {
      if (this.renderedDay && this.renderedDay !== this.today()) {
        this.updateDom(0);
      }
    }, 30 * 1000);
  },

  today() {
    return LunchDates.parts(this.config.timezone, this.config.debugDate).ymd;
  },

  requestData() {
    this.sendSocketNotification("LUNCH_LOAD", {
      instanceId: this.identifier,
      menuFile: this.config.menuFile,
      schoolFile: this.config.schoolFile,
    });
  },

  socketNotificationReceived(notification, payload) {
    if (!payload || payload.instanceId !== this.identifier) return;
    payload = notification.endsWith("_ERROR") ? payload.error : payload.data;
    if (notification === "LUNCH_DATA") {
      const raw = JSON.stringify(payload);
      if (raw === this.lastRaw && !this.errorText) {
        return;
      }
      this.lastRaw = raw;
      this.payload = payload;
      this.errorText = null;
      this.updateDom(0);
    } else if (notification === "LUNCH_ERROR") {
      this.errorText = payload;
      this.updateDom(0);
    }
  },

  // ---- small date helpers (calendar days only, no time zones involved) ----
  pad(n) {
    return String(n).padStart(2, "0");
  },

  localYmd(date) {
    return (
      date.getFullYear() +
      "-" +
      this.pad(date.getMonth() + 1) +
      "-" +
      this.pad(date.getDate())
    );
  },

  parts(ymd) {
    const p = String(ymd).split("-").map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  },

  addDays(ymd, n) {
    const d = this.parts(ymd);
    d.setUTCDate(d.getUTCDate() + n);
    return (
      d.getUTCFullYear() +
      "-" +
      this.pad(d.getUTCMonth() + 1) +
      "-" +
      this.pad(d.getUTCDate())
    );
  },

  weekdayName(ymd) {
    return [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][this.parts(ymd).getUTCDay()];
  },

  monthName(ymd) {
    return [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ][this.parts(ymd).getUTCMonth()];
  },

  el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) {
      node.className = cls;
    }
    if (text !== undefined && text !== null) {
      node.textContent = text;
    }
    return node;
  },

  getDom() {
    const wrapper = this.el("div", "schoollunch");

    if (this.errorText) {
      wrapper.appendChild(
        this.el("div", "sl-msg", "School lunch: " + this.errorText),
      );
      return wrapper;
    }
    if (!this.payload) {
      wrapper.appendChild(this.el("div", "sl-msg", "Loading school lunch..."));
      return wrapper;
    }

    const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
    const menu = this.payload.menu || {};
    const school = this.payload.school || {};
    const days = menu.days || {};
    const closed = school.closed || {};
    const early = school.earlyDismissal || {};
    let today;
    try {
      today = this.today();
    } catch (error) {
      wrapper.appendChild(this.el("div", "sl-msg", error.message));
      return wrapper;
    }
    this.renderedDay = today;

    const card = this.el("div", "sl-card");
    wrapper.appendChild(card);
    card.appendChild(this.el("div", "sl-label", "School lunch"));

    // Today's menu, or the next day that has one.
    let shown = null;
    for (let i = 0; i <= this.config.lookAheadDays; i++) {
      const d = this.addDays(today, i);
      const wd = this.parts(d).getUTCDay();
      if (has(days, d) && !has(closed, d) && wd !== 0 && wd !== 6) {
        shown = d;
        break;
      }
    }

    if (shown !== today) {
      const weekday = this.parts(today).getUTCDay();
      let why = "No lunch listed for today";
      if (has(closed, today)) {
        why = "No school today: " + closed[today];
      } else if (weekday === 0 || weekday === 6) {
        why = "No school today (weekend)";
      }
      card.appendChild(this.el("div", "sl-none", why));
    }

    if (shown) {
      const entry = days[shown];
      const head = this.el("div", "sl-head");
      head.appendChild(
        this.el(
          "span",
          "sl-when",
          shown === today ? "Today" : "Next: " + this.weekdayName(shown),
        ),
      );
      const flag =
        (has(early, shown) && early[shown]) ||
        (entry.earlyDismissal ? "Early dismissal" : null);
      if (flag) {
        head.appendChild(this.el("span", "sl-flag", flag));
      }
      card.appendChild(head);

      // module LUNCH EMOJI V7: display-only mapping; original menu remains untouched.
      const meal = String(entry.main || "");
      const matchers = [
        [/pizza|pepperoni|pizza bagel/i, "🍕"],
        [/waffle/i, "🧇"],
        [/burger/i, "🍔"],
        [/mac\s*(?:and|&)\s*cheese|pasta|lasagna|spaghetti/i, "🍝"],
        [/nacho|taco/i, "🌮"],
        [/grilled cheese|sandwich/i, "🥪"],
        [/french toast|pancake/i, "🥞"],
        [/mozzarella|breadstick/i, "🧀"],
        [/chicken|nugget|tender/i, "🍗"],
        [/rice/i, "🍚"],
        [/corndog|corn dog/i, "🌭"],
        [/salad/i, "🥗"],
      ];
      const emoji = /[\u{1F300}-\u{1FAFF}]/u.test(meal)
        ? ""
        : (matchers.find(([rx]) => rx.test(meal)) || [null, "🍽️"])[1];
      const mealRow = this.el("div", "sl-meal-row");
      if (emoji) mealRow.appendChild(this.el("span", "sl-food-emoji", emoji));
      mealRow.appendChild(this.el("div", "sl-main", meal));
      card.appendChild(mealRow);
      // module SCHOOL CARDS V1: show actual menu sides with activity icons.
      (entry.sides || []).forEach((s) => {
        const name = String(s || "");
        const icon =
          /fruit|apple|melon|grape|orange|clementine|pineapple|berry/i.test(
            name,
          )
            ? "🍎"
            : /salad|broccoli|vegetable|carrot|cucumber|bean|edamame|corn/i.test(
                  name,
                )
              ? "🥗"
              : /rice|potato|fries|bread|roll|knot/i.test(name)
                ? "🍚"
                : "🍽️";
        const row = this.el("div", "sl-v1-side");
        row.appendChild(this.el("span", "sl-v1-side-emoji", icon));
        row.appendChild(this.el("span", "sl-v1-side-text", name));
        card.appendChild(row);
      });
      (entry.notes || []).forEach((n) =>
        card.appendChild(this.el("div", "sl-note", n)),
      );
    }

    // Nudge when the monthly menu hasn't been loaded yet.
    const monthKey = today.slice(0, 7);
    if (!Object.keys(days).some((k) => k.indexOf(monthKey) === 0)) {
      card.appendChild(
        this.el(
          "div",
          "sl-warn",
          this.monthName(today) + " menu hasn't been added yet",
        ),
      );
    }

    if (this.config.showAlternates && shown) {
      const lines = (menu.alternates || []).concat(menu.alwaysAvailable || []);
      if (lines.length) {
        const box = this.el("div", "sl-also");
        box.appendChild(
          this.el("div", "sl-also-title", "Also available every day"),
        );
        lines.forEach((l) =>
          box.appendChild(this.el("div", "sl-also-line", l)),
        );
        card.appendChild(box);
      }
    }

    return wrapper;
  },
});
