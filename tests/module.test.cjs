const { test } = require("node:test");
const assert = require("node:assert/strict");
const { frontend, helper } = require("./support.cjs");

const menu = require("../lunch-menu.example.json"),
  school = require("../school-day.example.json");
test("independent card shows menu and side items", () => {
  const m = frontend({ debugDate: "2030-01-08" });
  m.start();
  m.socketNotificationReceived("LUNCH_DATA", {
    instanceId: "one",
    data: { menu, school },
  });
  assert.match(m.getDom().textContent, /Pasta/);
  assert.match(m.getDom().textContent, /Fresh fruit/);
  m.suspend();
});
test("closures override stale menus; next available meal is selected", () => {
  const m = frontend({ debugDate: "2030-01-08" });
  m.start();
  m.payload = {
    menu,
    school: { closed: { "2030-01-08": "Synthetic closure" } },
  };
  const text = m.getDom().textContent;
  assert.match(text, /Synthetic closure/);
  assert.match(text, /pizza/);
  assert.doesNotMatch(text, /Pasta/);
  m.suspend();
});
test("optional school file does not require a companion module", () => {
  const h = helper({ "lunch-menu.json": menu });
  h.socketNotificationReceived("LUNCH_LOAD", { instanceId: "one" });
  assert.equal(h.sent.n, "LUNCH_DATA");
  assert.equal(Object.keys(h.sent.p.data.school).length, 0);
});
test("bad menu and malformed existing school data report errors", () => {
  for (const files of [
    { "lunch-menu.json": "bad" },
    { "lunch-menu.json": menu, "school-day.json": "bad" },
  ]) {
    const h = helper(files);
    h.socketNotificationReceived("LUNCH_LOAD", { instanceId: "two" });
    assert.equal(h.sent.n, "LUNCH_ERROR");
    assert.equal(h.sent.p.instanceId, "two");
  }
});
test("other instance responses are ignored and timezone is configurable", () => {
  const m = frontend({ timezone: "Asia/Tokyo" }, "2030-01-08T23:00:00Z");
  m.start();
  m.socketNotificationReceived("LUNCH_DATA", {
    instanceId: "other",
    data: { menu },
  });
  assert.equal(m.payload, null);
  assert.equal(m.today(), "2030-01-09");
  m.suspend();
});
