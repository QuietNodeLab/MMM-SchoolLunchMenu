const NodeHelper = require("node_helper"),
  fs = require("node:fs"),
  path = require("node:path");
module.exports = NodeHelper.create({
  read(file) {
    const name = path.basename(String(file));
    const found = [
      path.join(global.root_path, "config", name),
      path.join(__dirname, name),
    ].find((p) => fs.existsSync(p));
    if (!found) throw Error("Missing " + name);
    return JSON.parse(fs.readFileSync(found, "utf8"));
  },
  optionalSchool(file) {
    const name = path.basename(String(file));
    const found = [
      path.join(global.root_path, "config", name),
      path.join(__dirname, name),
    ].some((p) => fs.existsSync(p));
    return found ? this.read(file) : {};
  },
  socketNotificationReceived(notification, payload) {
    if (
      notification !== "LUNCH_LOAD" ||
      !payload ||
      typeof payload.instanceId !== "string"
    )
      return;
    try {
      const data = {
        menu: this.read(payload.menuFile || "lunch-menu.json"),
        school: this.optionalSchool(payload.schoolFile || "school-day.json"),
      };
      this.sendSocketNotification("LUNCH_DATA", {
        instanceId: payload.instanceId,
        data,
      });
    } catch (error) {
      this.sendSocketNotification("LUNCH_ERROR", {
        instanceId: payload.instanceId,
        error: error.message,
      });
    }
  },
});
