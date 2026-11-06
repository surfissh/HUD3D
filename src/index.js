"use strict";

// 可行性验证用最小应用：一个“厨房倒计时”HUD 卡片。
// 说明：该示例只使用文档公开的 FusionUI 2D API，因此画面被固定在 640x480 的
// 头戴式画布中，不包含任何世界锚定/物体识别逻辑（SDK 未暴露）。

const { App, AppLifecycle, Window, WindowProperty, requestAnimationFrame, cancelAnimationFrame } = require("@irisview/osx/os");
const { Board, Color, Font, FusionRoot, Text, TextAlign, View } = require("@irisview/osx/fusionui");

const WIDTH = 640;
const HEIGHT = 480;
const TOTAL_MS = 24 * 60 * 1000;

const retained = {};
let endAt = 0;
let frame = null;
let active = false;
let lastKey = "";

function rect(parent, x, y, w, h, brightness) {
  const view = View.create();
  view.setParent(parent);
  view.setIgnoreLayout(true);
  view.setPosition([x, y, 0]);
  view.setSize([w, h, 0]);
  view.getLocalStyle().setBackgroundColor(Color.fromRGB8(0, brightness, 0));
  return view;
}

function label(parent, x, y, w, h, size, brightness, text, align) {
  const node = Text.create();
  node.setParent(parent);
  node.setIgnoreLayout(true);
  node.setPosition([x, y, 0]);
  node.setSize([w, h, 0]);
  const style = node.getLocalStyle();
  style.setTextColor(Color.fromRGB8(0, brightness, 0));
  style.setTextAlign(align === undefined ? TextAlign.LEFT_MID : align);
  const font = Font.getCachedFont("", size, 0, 0);
  if (font) style.setTextFont(font);
  node.setText(text);
  return node;
}

function mmss(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function paint() {
  const remaining = endAt - Date.now();
  const key = String(Math.max(0, Math.ceil(remaining / 1000)));
  if (key === lastKey) return;
  lastKey = key;

  const done = remaining <= 0;
  const timeText = done ? "完成" : mmss(remaining);
  if (retained.lastTimeText !== timeText) {
    retained.time.setText(timeText);
    retained.lastTimeText = timeText;
  }

  const minutes = Math.floor(Math.max(0, remaining) / 60000);
  const seconds = Math.ceil(Math.max(0, remaining) % 60000 / 1000);
  retained.detail.setText(done ? "请取出食物" : "剩余 " + minutes + " 分 " + seconds + " 秒 · 预计 " + retained.readyAt + " 完成");
  retained.alert.setText(done ? "已完成 · 请及时取出" : "烘烤中 · 温度 190°C");

  const ratio = done ? 1 : Math.min(1, Math.max(0, 1 - remaining / TOTAL_MS));
  retained.barFill.setSize([Math.round(560 * ratio), 6, 0]);
}

function tick() {
  frame = null;
  if (!active) return;
  paint();
  frame = requestAnimationFrame(tick);
}

function resume() {
  if (!retained.window || active) return;
  active = true;
  frame = requestAnimationFrame(tick);
}

function pause() {
  active = false;
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
}

function start() {
  if (retained.window) return;
  endAt = Date.now() + TOTAL_MS;
  retained.readyAt = new Date(endAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

  const property = WindowProperty.create();
  property.setTitle("烤箱倒计时");
  property.setSize([0.64, 0.48, 0.01]);
  retained.window = Window.create(property);
  retained.root = FusionRoot.acquireFusionRootFromWindow(retained.window);

  const canvas = Board.create();
  canvas.setParent(retained.root.getRootWidget());
  canvas.setIgnoreLayout(true);
  canvas.setSize([WIDTH, HEIGHT, 0]);
  canvas.getLocalStyle().setBackgroundColor(Color.fromRGB8(0, 0, 0));
  retained.canvas = canvas;

  // 顶部状态行
  label(canvas, 32, 20, 300, 24, 15, 90, "厨房 · 烤箱");
  retained.alert = label(canvas, 32, 20, 576, 24, 15, 90, "烘烤中 · 温度 190°C", TextAlign.RIGHT_MID);

  // 主信息：巨大倒计时
  retained.time = label(canvas, 32, 78, 576, 120, 96, 240, "--:--", TextAlign.LEFT_MID);

  // 次信息
  retained.detail = label(canvas, 32, 206, 576, 30, 20, 150, "", TextAlign.LEFT_MID);

  // 进度条
  rect(canvas, 32, 268, 560, 6, 36);
  retained.barFill = rect(canvas, 32, 268, 0, 6, 210);

  // 底部说明
  label(canvas, 32, 292, 576, 24, 14, 70, "示例：公开 SDK 只提供固定画布，内容不随真实物体定位", TextAlign.LEFT_MID);
  label(canvas, 32, 420, 576, 22, 13, 55, "partner.oven-hud · FusionUI / IrisView Developer Kit v1.0.0", TextAlign.LEFT_MID);

  paint();
  resume();
}

App.createApp((lifecycle) => {
  if (lifecycle === AppLifecycle.ON_CREATE) start();
  else if (lifecycle === AppLifecycle.ON_FOREGROUND || lifecycle === AppLifecycle.ON_REOPEN) resume();
  else if (lifecycle === AppLifecycle.ON_BACKGROUND) pause();
  else if (lifecycle === AppLifecycle.ON_DESTROY) {
    pause();
    for (const key of Object.keys(retained)) delete retained[key];
  }
});
