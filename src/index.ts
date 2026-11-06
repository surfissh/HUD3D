import {
  App,
  AppLifecycle,
  Window,
  WindowProperty,
  cancelAnimationFrame,
  requestAnimationFrame,
} from "@irisview/osx/os";
import {
  Board,
  Color,
  Font,
  FusionRoot,
  Text,
  TextAlign,
  View,
} from "@irisview/osx/fusionui";
import type { Widget } from "@irisview/osx/fusionui";

// IrisView 应用：厨房倒计时 HUD。
// 只使用公开的 FusionUI 2D API；画面固定在 640×480 画布上，不含世界锚定。

const WIDTH = 640;
const HEIGHT = 480;
const TOTAL_MS = 24 * 60 * 1000;

interface Retained {
  window?: Window;
  root?: FusionRoot;
  canvas?: Board;
  time?: Text;
  detail?: Text;
  alert?: Text;
  barFill?: View;
  readyAt?: string;
  lastTimeText?: string;
}

const retained: Retained = {};
let endAt = 0;
let frame: number | null = null;
let active = false;
let lastKey = "";

function rect(
  parent: Widget,
  x: number,
  y: number,
  w: number,
  h: number,
  brightness: number,
): View {
  const view = View.create();
  view.setParent(parent);
  view.setIgnoreLayout(true);
  view.setPosition([x, y, 0]);
  view.setSize([w, h, 0]);
  view.getLocalStyle().setBackgroundColor(Color.fromRGB8(0, brightness, 0));
  return view;
}

function label(
  parent: Widget,
  x: number,
  y: number,
  w: number,
  h: number,
  size: number,
  brightness: number,
  text: string,
  align: TextAlign = TextAlign.LEFT_MID,
): Text {
  const node = Text.create();
  node.setParent(parent);
  node.setIgnoreLayout(true);
  node.setPosition([x, y, 0]);
  node.setSize([w, h, 0]);
  const style = node.getLocalStyle();
  style.setTextColor(Color.fromRGB8(0, brightness, 0));
  style.setTextAlign(align);
  const font = Font.getCachedFont("", size, 0, 0);
  if (font) style.setTextFont(font);
  node.setText(text);
  return node;
}

function mmss(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function paint(): void {
  const { time, detail, alert, barFill } = retained;
  if (!time || !detail || !alert || !barFill) return;

  const remaining = endAt - Date.now();
  const key = String(Math.max(0, Math.ceil(remaining / 1000)));
  if (key === lastKey) return;
  lastKey = key;

  const done = remaining <= 0;
  const timeText = done ? "完成" : mmss(remaining);
  if (retained.lastTimeText !== timeText) {
    time.setText(timeText);
    retained.lastTimeText = timeText;
  }

  const minutes = Math.floor(Math.max(0, remaining) / 60000);
  const seconds = Math.ceil((Math.max(0, remaining) % 60000) / 1000);
  detail.setText(
    done
      ? "请取出食物"
      : `剩余 ${minutes} 分 ${seconds} 秒 · 预计 ${retained.readyAt ?? ""} 完成`,
  );
  alert.setText(done ? "已完成 · 请及时取出" : "烘烤中 · 温度 190°C");

  const ratio = done ? 1 : Math.min(1, Math.max(0, 1 - remaining / TOTAL_MS));
  barFill.setSize([Math.round(560 * ratio), 6, 0]);
}

function tick(): void {
  frame = null;
  if (!active) return;
  paint();
  frame = requestAnimationFrame(tick);
}

function resume(): void {
  if (!retained.window || active) return;
  active = true;
  frame = requestAnimationFrame(tick);
}

function pause(): void {
  active = false;
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
}

function start(): void {
  if (retained.window) return;
  endAt = Date.now() + TOTAL_MS;
  retained.readyAt = new Date(endAt).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const property = WindowProperty.create();
  property.setTitle("烤箱倒计时");
  property.setSize([0.64, 0.48, 0.01]);
  const window = Window.create(property);
  retained.window = window;
  const root = FusionRoot.acquireFusionRootFromWindow(window);
  retained.root = root;

  const canvas = Board.create();
  canvas.setParent(root.getRootWidget());
  canvas.setIgnoreLayout(true);
  canvas.setSize([WIDTH, HEIGHT, 0]);
  canvas.getLocalStyle().setBackgroundColor(Color.fromRGB8(0, 0, 0));
  retained.canvas = canvas;

  // 顶部状态行
  label(canvas, 32, 20, 300, 24, 15, 90, "厨房 · 烤箱");
  retained.alert = label(
    canvas,
    32,
    20,
    576,
    24,
    15,
    90,
    "烘烤中 · 温度 190°C",
    TextAlign.RIGHT_MID,
  );

  // 主信息：巨大倒计时
  retained.time = label(
    canvas,
    32,
    78,
    576,
    120,
    96,
    240,
    "--:--",
    TextAlign.LEFT_MID,
  );

  // 次信息
  retained.detail = label(canvas, 32, 206, 576, 30, 20, 150, "", TextAlign.LEFT_MID);

  // 进度条
  rect(canvas, 32, 268, 560, 6, 36);
  retained.barFill = rect(canvas, 32, 268, 0, 6, 210);

  // 底部说明
  label(
    canvas,
    32,
    292,
    576,
    24,
    14,
    70,
    "示例：公开 SDK 只提供固定画布，内容不随真实物体定位",
    TextAlign.LEFT_MID,
  );
  label(
    canvas,
    32,
    420,
    576,
    22,
    13,
    55,
    "partner.oven-hud · FusionUI / IrisView Developer Kit v1.0.1",
    TextAlign.LEFT_MID,
  );

  paint();
  resume();
}

App.createApp((lifecycle: AppLifecycle): void => {
  if (lifecycle === AppLifecycle.ON_CREATE) {
    start();
  } else if (
    lifecycle === AppLifecycle.ON_FOREGROUND ||
    lifecycle === AppLifecycle.ON_REOPEN
  ) {
    resume();
  } else if (lifecycle === AppLifecycle.ON_BACKGROUND) {
    pause();
  } else if (lifecycle === AppLifecycle.ON_DESTROY) {
    pause();
    delete retained.window;
    delete retained.root;
    delete retained.canvas;
    delete retained.time;
    delete retained.detail;
    delete retained.alert;
    delete retained.barFill;
    delete retained.readyAt;
    delete retained.lastTimeText;
  }
});
