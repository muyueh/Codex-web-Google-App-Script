/**
 * Simple helper that shows how shared utilities can stay outside of GAS project folders.
 * Apps Script 不支援直接 import Node module，所以建議視需要複製此程式碼到各專案。
 */
function exampleUtil(name) {
  return `Hello, ${name}! This is a shared util.`;
}

module.exports = { exampleUtil };
