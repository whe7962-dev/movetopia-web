import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Expand,
  Home,
  Image,
  Info,
  LoaderCircle,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  AlertCircle,
  Leaf,
  Aperture,
} from "lucide-react";

type Page =
  | "home"
  | "permissions"
  | "practice"
  | "camera"
  | "select"
  | "generate"
  | "result"
  | "gallery"
  | "camera-error";
type Modal = "privacy" | "zoom" | "leave" | null;
const pages: Page[] = [
  "home",
  "permissions",
  "practice",
  "camera",
  "select",
  "generate",
  "result",
  "gallery",
  "camera-error",
];
const photos = [
  {
    id: "01",
    src: `${import.meta.env.BASE_URL}images/warrior.png`,
    name: "舒展时刻",
    detail: "自然光 · 完整姿态",
  },
  {
    id: "02",
    src: `${import.meta.env.BASE_URL}images/home.png`,
    name: "安静呼吸",
    detail: "晨间光影 · 坐姿",
  },
  {
    id: "03",
    src: `${import.meta.env.BASE_URL}images/camera.png`,
    name: "自在延伸",
    detail: "留白空间 · 站姿",
  },
];
const readPage = (): Page => {
  const p = location.hash.slice(1) as Page;
  return pages.includes(p) ? p : "home";
};
const safeRead = (key: string) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};
function Button({
  children,
  onClick,
  primary = false,
  className = "",
  disabled = false,
  ...props
}: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-pressed"?: boolean;
}) {
  return (
    <button
      type="button"
      className={`button ${primary ? "primary" : ""} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>(readPage);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    safeRead("movetopia-selection"),
  );
  const [voice, setVoice] = useState(false);
  const [remaining, setRemaining] = useState(600);
  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [captured, setCaptured] = useState(false);
  const [framing, setFraming] = useState<"ready" | "edge" | "absent">("ready");
  const [generation, setGeneration] = useState<
    "idle" | "running" | "failed" | "done"
  >("idle");
  const [failNext, setFailNext] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [pendingPage, setPendingPage] = useState<Page>("home");
  const [toast, setToast] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [simulateSaveError, setSimulateSaveError] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const chosen = photos.find((photo) => photo.id === selectedId);
  const selected = chosen || photos[0];
  const fullscreen = page === "practice" || page === "camera";

  useEffect(() => {
    const onHash = () => {
      setPage(readPage());
      setCountdown(null);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    try {
      if (selectedId) sessionStorage.setItem("movetopia-selection", selectedId);
      else sessionStorage.removeItem("movetopia-selection");
    } catch {
      /* Memory state still works in private mode. */
    }
  }, [selectedId]);
  useEffect(() => {
    if (modal) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [modal]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (page !== "practice" || paused || remaining === 0) return;
    const timer = window.setInterval(
      () => setRemaining((r) => Math.max(0, r - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [page, paused, remaining === 0]);
  useEffect(() => {
    if (countdown === null || page !== "camera") return;
    const timer = window.setTimeout(() => {
      if (countdown > 1) setCountdown(countdown - 1);
      else {
        setCountdown(null);
        setCaptured(true);
        setSelectedId(null);
        location.hash = "select";
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, page]);
  useEffect(() => {
    if (page !== "generate" || generation !== "running") return;
    const timer = window.setTimeout(() => {
      if (failNext) {
        setGeneration("failed");
        setFailNext(false);
      } else {
        setGeneration("done");
        location.hash = "result";
      }
    }, 3500);
    return () => clearTimeout(timer);
  }, [page, generation, failNext]);
  useEffect(() => {
    if (page === "generate" && generation === "idle" && chosen)
      setGeneration("running");
  }, [page, chosen, generation]);
  useEffect(() => {
    if (
      !voice ||
      !fullscreen ||
      (page === "practice" && paused) ||
      !("speechSynthesis" in window)
    )
      return;
    const speech = new SpeechSynthesisUtterance(
      page === "practice"
        ? "放松肩膀，舒展双臂，保持自然呼吸。"
        : "请让头部、双手和双脚完整入镜。准备好后，点击拍摄。",
    );
    speech.lang = "zh-CN";
    speech.rate = 0.85;
    window.speechSynthesis.speak(speech);
    return () => window.speechSynthesis.cancel();
  }, [voice, fullscreen, page, paused]);
  useEffect(() => {
    if (page !== "generate" || generation !== "running") return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [page, generation]);

  function navigate(next: Page) {
    if (page === "generate" && generation === "running") {
      setPendingPage(next);
      setModal("leave");
      return;
    }
    go(next);
  }
  function go(next: Page) {
    setCountdown(null);
    setPage(next);
    location.hash = next;
    window.scrollTo(0, 0);
  }
  function startPractice() {
    setRemaining(600);
    setPaused(false);
    go("practice");
  }
  function startGeneration() {
    if (!chosen) return;
    setGeneration("running");
    setSaveError(false);
    go("generate");
  }
  function choose(id: string) {
    setSelectedId(id);
    setSaveError(false);
  }
  async function savePhoto() {
    if (downloading) return;
    setDownloading(true);
    setSaveError(false);
    try {
      if (simulateSaveError) {
        setSimulateSaveError(false);
        throw new Error("Demo save failure");
      }
      const response = await fetch(selected.src);
      if (!response.ok) throw new Error("Image unavailable");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `MoveTopia-演示样片-${selected.id}.png`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setToast("已发起下载，请在浏览器下载列表中查看。");
    } catch {
      setSaveError(true);
    } finally {
      setDownloading(false);
    }
  }
  const navItems: { page: Page; label: string; icon: ReactNode }[] = [
    { page: "home", label: "首页", icon: <Home /> },
    { page: "permissions", label: "轻量练习", icon: <Leaf /> },
    { page: "camera", label: "拍照选片", icon: <Camera /> },
    { page: "gallery", label: "作品示例", icon: <Image /> },
  ];

  return (
    <>
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        跳转到内容
      </a>
      {!fullscreen && (
        <aside className="sidebar">
          <button
            className="wordmark"
            onClick={() => navigate("home")}
            aria-label="MoveTopia 首页"
          >
            MoveTopia<span>MOVE. BREATHE. BE YOU.</span>
          </button>
          <nav aria-label="主要导航">
            {navItems.map((item) => (
              <button
                key={item.page}
                className={`nav-item ${page === item.page || (item.page === "camera" && ["select", "generate", "result"].includes(page)) ? "active" : ""}`}
                onClick={() => navigate(item.page)}
                aria-current={page === item.page ? "page" : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
                <ChevronRight className="nav-arrow" />
              </button>
            ))}
            <button className="nav-item" onClick={() => setModal("privacy")}>
              <Info />
              <span>使用说明</span>
              <ChevronRight className="nav-arrow" />
            </button>
          </nav>
          <div className="sidebar-note">
            <Aperture size={26} strokeWidth={1} />
            <p>慢一点，也很好。</p>
            <span>属于你的身体影像</span>
          </div>
          <div className="sidebar-bottom">
            <span className="status-dot" />
            前端体验版 <span>V 0.1</span>
          </div>
        </aside>
      )}
      <main
        id="main"
        tabIndex={-1}
        className={fullscreen ? "immersive" : "main"}
      >
        {page === "home" && (
          <div className="page home-page">
            <div className="eyebrow">
              <span>首页 / 你的瑜伽创作空间</span>
              <span className="edition">MOVETOPIA STUDIO</span>
            </div>
            <header className="home-heading">
              <h1>今天，留一点时间给自己。</h1>
              <p>从一次舒展开始，留住最自然的你。</p>
            </header>
            <section className="hero-layout" aria-label="开始瑜伽体验">
              <figure className="hero-photo">
                <img
                  src={photos[1].src}
                  alt="晨光中静坐的瑜伽人物，身体姿态舒展自然"
                  fetchPriority="high"
                />
                <figcaption>
                  <span>AI 效果示例 · 非用户真实成片</span>
                  <span>01 / 身体、呼吸与此刻</span>
                </figcaption>
              </figure>
              <div className="start-card card">
                <div className="card-top">
                  <Leaf size={24} />
                  <span>10 MINUTES FOR YOU</span>
                </div>
                <div>
                  <h2>从一次舒展开始</h2>
                  <p>
                    10 分钟轻量练习，唤醒身体。
                    <br />
                    跟随语音与镜头提示，拍照、选片，
                    <br className="desktop-break" />
                    留下一张属于你的瑜伽写真。
                  </p>
                </div>
                <div className="start-actions">
                  <Button primary onClick={() => navigate("permissions")}>
                    开始 10 分钟练习 <ArrowRight />
                  </Button>
                  <span className="small muted">
                    可跳过等待，快速体验完整流程
                  </span>
                </div>
                <button
                  className="text-button"
                  onClick={() => setModal("privacy")}
                >
                  <ShieldCheck size={16} />
                  摄像头与照片处理说明 <ChevronRight size={15} />
                </button>
              </div>
            </section>
            <section className="flow-grid" aria-label="体验流程">
              {[
                {
                  n: "01",
                  title: "轻量练习",
                  desc: "放下忙碌，给身体一点舒展的时间。",
                  icon: <Leaf />,
                  target: "permissions" as Page,
                },
                {
                  n: "02",
                  title: "拍照选片",
                  desc: "跟随取景提示，选择自在的姿态。",
                  icon: <Camera />,
                  target: "camera" as Page,
                },
                {
                  n: "03",
                  title: "生成写真",
                  desc: "把这一刻，留在自己的影像里。",
                  icon: <Sparkles />,
                  target: "select" as Page,
                },
              ].map((step) => (
                <button
                  className="flow-card card"
                  key={step.n}
                  onClick={() => navigate(step.target)}
                >
                  <div className="flow-top">
                    <span>{step.n}</span>
                    {step.icon}
                  </div>
                  <div className="flow-title">
                    <h3>{step.title}</h3>
                    <ArrowRight size={18} />
                  </div>
                  <p>{step.desc}</p>
                </button>
              ))}
            </section>
            <div className="privacy-strip">
              <ShieldCheck />
              <div>
                <h3>关于镜头，也关于安心。</h3>
                <p>
                  当前版本使用示例画面，不访问摄像头，不上传照片。你可以安心体验整个创作过程。
                </p>
              </div>
              <button
                className="text-button"
                onClick={() => setModal("privacy")}
              >
                了解更多 <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {(page === "permissions" || page === "camera-error") && (
          <div className="page">
            <PageHeading
              eyebrow="开始之前"
              title={
                page === "camera-error"
                  ? "摄像头暂时无法使用"
                  : "准备好，给自己 10 分钟"
              }
              subtitle="找一处光线柔和、可以舒展身体的空间。"
              back={() => navigate("home")}
            />
            <div className="permission-layout">
              <figure className="permission-photo">
                <img src={photos[1].src} alt="光线柔和的瑜伽空间" />
                <figcaption>环境与摄影效果示例</figcaption>
              </figure>
              <section className="card permission-card">
                <div className="section-icon">
                  {page === "camera-error" ? <AlertCircle /> : <Camera />}
                </div>
                <h2>
                  {page === "camera-error"
                    ? "检查权限后，再试一次"
                    : "让身体和镜头，都准备好"}
                </h2>
                {page === "camera-error" ? (
                  <>
                    <p>
                      这是摄像头权限受阻的演示状态。正式接入时，请检查浏览器摄像头权限，或关闭正在占用摄像头的应用。
                    </p>
                    <Button primary onClick={() => navigate("permissions")}>
                      <RotateCcw />
                      重新检查
                    </Button>
                    <Button onClick={startPractice}>
                      使用示例继续体验 <ArrowRight />
                    </Button>
                  </>
                ) : (
                  <>
                    <ul className="checklist">
                      <li>
                        <CheckCircle2 />
                        <div>
                          <b>留出全身入镜的空间</b>
                          <span>头部、双手与双脚都应完整可见。</span>
                        </div>
                      </li>
                      <li>
                        <Volume2 />
                        <div>
                          <b>语音可以随时关闭</b>
                          <span>开启后使用浏览器语音朗读简单提示。</span>
                        </div>
                      </li>
                      <li>
                        <ShieldCheck />
                        <div>
                          <b>示例体验，不访问摄像头</b>
                          <span>本版不会采集、保存或上传你的影像。</span>
                        </div>
                      </li>
                    </ul>
                    <Button primary onClick={startPractice}>
                      <Play />
                      使用示例，开始练习
                    </Button>
                    <Button onClick={() => navigate("camera")}>
                      直接体验拍照 <ArrowRight />
                    </Button>
                    <details className="demo-options">
                      <summary>演示选项</summary>
                      <button
                        className="text-button"
                        onClick={() => navigate("camera-error")}
                      >
                        查看摄像头无法使用状态
                      </button>
                    </details>
                  </>
                )}
              </section>
            </div>
          </div>
        )}

        {fullscreen && (
          <>
            <img
              className="camera-feed"
              src={photos[2].src}
              alt="示例取景画面：瑜伽人物全身完整入镜"
            />
            <div className="camera-top">
              <Button onClick={() => navigate("home")} aria-label="退出到首页">
                <ArrowLeft />
                <span>返回</span>
              </Button>
              <span className="camera-brand">MoveTopia</span>
              <Button onClick={() => setVoice(!voice)} aria-pressed={voice}>
                {voice ? <Volume2 /> : <VolumeX />}
                <span>语音{voice ? "开启" : "关闭"}</span>
              </Button>
            </div>
            <div className="camera-badges">
              <span className="glass-label small">
                <span className="status-dot" />
                示例画面 · 未连接摄像头
              </span>
              {page === "practice" ? (
                <span className="glass-label">
                  <Clock3 size={18} />
                  <b className="timer">
                    {String(Math.floor(remaining / 60)).padStart(2, "0")}:
                    {String(remaining % 60).padStart(2, "0")}
                  </b>
                  <span>
                    {remaining === 0
                      ? "练习完成"
                      : paused
                        ? "已暂停"
                        : "轻柔舒展"}
                  </span>
                </span>
              ) : (
                <span
                  className={`glass-label framing ${framing !== "ready" ? "framing-alert" : ""}`}
                  role="status"
                >
                  {framing === "ready" ? (
                    <Check size={18} />
                  ) : (
                    <AlertCircle size={18} />
                  )}
                  <span>
                    {framing === "ready"
                      ? "完整入镜 · 示例状态"
                      : framing === "edge"
                        ? "请后退一点，让手脚完整入镜"
                        : "尚未入镜，请走到镜头中央"}
                  </span>
                </span>
              )}
            </div>
            {countdown !== null && (
              <div className="countdown" aria-live="assertive">
                <span>保持姿势</span>
                <strong key={countdown}>{countdown}</strong>
                <span>倒计时拍摄 · 演示</span>
              </div>
            )}
            {page === "practice" && paused && (
              <div className="pause-overlay">
                <div>
                  <Pause size={32} />
                  <h2>休息一下，慢慢来。</h2>
                  <p>准备好后，再继续舒展。</p>
                  <Button primary onClick={() => setPaused(false)}>
                    <Play />
                    继续练习
                  </Button>
                </div>
              </div>
            )}
            <div className="camera-bottom">
              <div className="pose-tip">
                {voice ? <Volume2 size={18} /> : <Info size={18} />}
                <span>
                  {page === "practice"
                    ? remaining === 0
                      ? "练习结束，记录此刻舒展的自己。"
                      : "放松肩膀，舒展双臂，保持自然呼吸。"
                    : "让头部、双手和双脚完整入镜。"}
                </span>
              </div>
              {page === "practice" ? (
                <div className="camera-actions">
                  <Button
                    onClick={() => setPaused(!paused)}
                    disabled={remaining === 0}
                  >
                    {paused ? <Play /> : <Pause />}
                    {paused ? "继续练习" : "暂停练习"}
                  </Button>
                  <Button primary onClick={() => navigate("camera")}>
                    {remaining === 0 ? "进入拍照" : "结束练习，进入拍照"}
                    <ArrowRight />
                  </Button>
                </div>
              ) : (
                <div className="camera-actions">
                  <Button
                    primary
                    disabled={framing !== "ready"}
                    onClick={() => setCountdown(countdown === null ? 3 : null)}
                  >
                    {countdown === null ? <Camera /> : <X />}
                    {countdown === null ? "3 秒倒计时拍摄" : "取消拍摄"}
                  </Button>
                </div>
              )}
              <div className="camera-footnote">
                {page === "practice"
                  ? "轻量练习演示 · 可直接进入拍照"
                  : "倒计时结束后，使用示例照片进行选片"}
              </div>
            </div>
            {page === "camera" && countdown === null && (
              <details className="camera-demo">
                <summary>
                  <ScanLine size={15} />
                  入镜状态演示
                </summary>
                <div>
                  <button
                    onClick={() => setFraming("ready")}
                    aria-pressed={framing === "ready"}
                  >
                    完整入镜
                  </button>
                  <button
                    onClick={() => setFraming("edge")}
                    aria-pressed={framing === "edge"}
                  >
                    边缘遮挡
                  </button>
                  <button
                    onClick={() => setFraming("absent")}
                    aria-pressed={framing === "absent"}
                  >
                    无人入镜
                  </button>
                </div>
              </details>
            )}
          </>
        )}

        {page === "select" && (
          <div className="page">
            <PageHeading
              eyebrow="02 / 拍照选片"
              title="挑一张，最自在的自己。"
              subtitle={
                captured
                  ? "倒计时演示已完成。以下为示例照片，请选择一张继续。"
                  : "选择一张示例照片，体验完整的写真创作流程。"
              }
              back={() => navigate("camera")}
            />
            <div className="workspace">
              <section className="card photo-panel">
                <div className="panel-top">
                  <span>
                    <Image size={18} />
                    照片预览
                  </span>
                  <span>{chosen ? `${chosen.id} / 03` : "待选择"}</span>
                </div>
                <button
                  className="photo-preview"
                  onClick={() => setModal("zoom")}
                  aria-label="放大查看当前照片"
                >
                  <img
                    src={selected.src}
                    alt={`${selected.name}，瑜伽摄影示例`}
                  />
                  <span className="zoom-affordance">
                    <Expand size={18} />
                    放大查看
                  </span>
                </button>
                <p className="photo-caption">
                  示例照片 · 请留意身体完整性与面部清晰度
                </p>
              </section>
              <section className="card action-panel">
                <div>
                  <span className="eyebrow">YOUR MOMENT</span>
                  <h2>选择照片</h2>
                  <p>
                    {chosen ? "已选 1 张，共 3 张。" : "还没有选择照片。"}
                    <br />
                    找到喜欢的姿态，再继续创作。
                  </p>
                </div>
                <div
                  className="photo-options"
                  role="group"
                  aria-label="选择一张照片"
                >
                  {photos.map((photo) => (
                    <button
                      key={photo.id}
                      className={`photo-option ${selectedId === photo.id ? "selected" : ""}`}
                      onClick={() => choose(photo.id)}
                      aria-pressed={selectedId === photo.id}
                    >
                      <img src={photo.src} alt={photo.name} />
                      <span>
                        <b>照片 {photo.id}</b>
                        <small>{photo.name}</small>
                      </span>
                      <span className="selection-check">
                        {selectedId === photo.id ? <Check size={16} /> : null}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="action-bottom">
                  <Button primary disabled={!chosen} onClick={startGeneration}>
                    <Sparkles />
                    生成瑜伽大片
                    <ArrowRight />
                  </Button>
                  <Button onClick={() => navigate("camera")}>
                    <RotateCcw />
                    重新拍摄
                  </Button>
                  <p className="small muted">
                    本版模拟生成流程，不上传照片或调用 AI。
                  </p>
                  <details className="demo-options">
                    <summary>演示选项</summary>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={failNext}
                        onChange={(e) => setFailNext(e.target.checked)}
                      />
                      本次模拟生成失败，查看重试流程
                    </label>
                  </details>
                </div>
              </section>
            </div>
          </div>
        )}

        {page === "generate" && (
          <div className="page">
            <PageHeading
              eyebrow="03 / 生成作品"
              title={
                generation === "failed"
                  ? "再试一次，好照片值得等待。"
                  : "让这一刻，慢慢成片。"
              }
              subtitle="所选照片会保留在这里。"
              back={() => navigate("select")}
            />
            {!chosen ? (
              <EmptyState onSelect={() => navigate("select")} />
            ) : (
              <div className="workspace">
                <section className="card photo-panel">
                  <div className="panel-top">
                    <span>
                      <Image size={18} />
                      所选照片
                    </span>
                    <span>照片 {selected.id}</span>
                  </div>
                  <div
                    className={`photo-preview processing ${generation === "running" ? "is-processing" : ""}`}
                  >
                    <img src={selected.src} alt={`所选照片 ${selected.id}`} />
                    {generation === "running" && (
                      <span className="process-label">
                        <LoaderCircle className="spin" size={16} />
                        模拟处理中
                      </span>
                    )}
                  </div>
                  <p className="photo-caption">保留你的选择，等待完成。</p>
                </section>
                <section className="card action-panel generation-panel">
                  <div className="section-icon">
                    {generation === "failed" ? (
                      <AlertCircle />
                    ) : (
                      <LoaderCircle className="spin" />
                    )}
                  </div>
                  <h2>
                    {generation === "failed"
                      ? "本次未能生成写真"
                      : "正在模拟生成流程"}
                  </h2>
                  <p role="status">
                    {generation === "failed"
                      ? "这是生成失败的演示状态。已保留所选照片，你可以直接重试。"
                      : "正在演示照片处理与完成反馈。此过程不调用 AI，完成后展示所选示例原图。"}
                  </p>
                  <div className="status-list">
                    <span>
                      <CheckCircle2 size={18} />
                      所选照片已就绪
                    </span>
                    <span>
                      {generation === "failed" ? (
                        <AlertCircle size={18} />
                      ) : (
                        <LoaderCircle className="spin" size={18} />
                      )}
                      <b>
                        {generation === "failed"
                          ? "生成未完成"
                          : "等待演示任务完成"}
                      </b>
                    </span>
                  </div>
                  <div className="action-bottom">
                    {generation === "failed" ? (
                      <Button primary onClick={startGeneration}>
                        <RotateCcw />
                        重新生成
                      </Button>
                    ) : (
                      <Button primary disabled>
                        <LoaderCircle className="spin" />
                        正在处理中
                      </Button>
                    )}
                    <Button onClick={() => navigate("select")}>返回选片</Button>
                    <p className="small muted">演示模式 · 无真实生成进度</p>
                  </div>
                </section>
              </div>
            )}
          </div>
        )}

        {page === "result" && (
          <div className="page">
            <PageHeading
              eyebrow="04 / 查看保存"
              title="留住这一刻的舒展。"
              subtitle="你的选择，值得被认真看见。"
              back={() => navigate("select")}
            />
            {!chosen ? (
              <EmptyState onSelect={() => navigate("select")} />
            ) : (
              <div className="workspace">
                <section className="card photo-panel">
                  <div className="panel-top">
                    <span>
                      <Image size={18} />
                      作品预览
                    </span>
                    <span>照片 {selected.id}</span>
                  </div>
                  <button
                    className="photo-preview"
                    onClick={() => setModal("zoom")}
                    aria-label="放大查看作品"
                  >
                    <img
                      src={selected.src}
                      alt={`${selected.name}，当前选择的演示作品`}
                    />
                    <span className="zoom-affordance">
                      <Maximize size={18} />
                      查看大图
                    </span>
                  </button>
                  <p className="photo-caption">
                    演示作品 · 当前为所选原图，尚未进行 AI 处理
                  </p>
                </section>
                <section className="card action-panel">
                  <span className="completed-label">
                    <CheckCircle2 size={18} />
                    演示流程已完成
                  </span>
                  <div>
                    <h2>{selected.name}</h2>
                    <p>
                      照片 {selected.id} · {selected.detail}
                      <br />
                      你可以放大查看，或下载这张示例图片。
                    </p>
                  </div>
                  <div className="result-note">
                    <ShieldCheck size={18} />
                    <p>所选照片未上传。真实 AI 写真生成将在接入后端后开放。</p>
                  </div>
                  <div className="action-bottom">
                    {saveError && (
                      <div className="error-message" role="alert">
                        <AlertCircle size={18} />
                        <span>下载未能发起，请重试或放大后保存图片。</span>
                      </div>
                    )}
                    <Button primary disabled={downloading} onClick={savePhoto}>
                      {downloading ? (
                        <LoaderCircle className="spin" />
                      ) : (
                        <Download />
                      )}
                      {saveError
                        ? "重试下载"
                        : downloading
                          ? "正在准备下载"
                          : "下载示例照片"}
                    </Button>
                    <Button onClick={() => setModal("zoom")}>
                      <Expand />
                      放大查看
                    </Button>
                    <button
                      className="text-button centered"
                      onClick={() => navigate("select")}
                    >
                      <ArrowLeft size={16} />
                      返回，换一张照片
                    </button>
                    <details className="demo-options">
                      <summary>演示选项</summary>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={simulateSaveError}
                          onChange={(e) =>
                            setSimulateSaveError(e.target.checked)
                          }
                        />
                        下一次下载模拟失败
                      </label>
                    </details>
                  </div>
                </section>
              </div>
            )}
          </div>
        )}

        {page === "gallery" && (
          <div className="page">
            <PageHeading
              eyebrow="MOVETOPIA / 作品示例"
              title="身体，自有它的美。"
              subtitle="以下均为 AI 摄影示例，用于展示风格方向，不代表真实生成效果。"
            />
            <div className="gallery-grid">
              {photos.map((photo) => (
                <button
                  className="gallery-card card"
                  key={photo.id}
                  onClick={() => {
                    choose(photo.id);
                    navigate("select");
                  }}
                >
                  <img src={photo.src} alt={photo.name} />
                  <div>
                    <span className="small muted">示例 / {photo.id}</span>
                    <h2>{photo.name}</h2>
                    <p>
                      {photo.detail}
                      <ArrowRight size={18} />
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {!fullscreen && (
          <footer className="footer">
            <span>© MoveTopia · 让舒展被看见</span>
            <button onClick={() => setModal("privacy")}>照片与隐私说明</button>
          </footer>
        )}
      </main>
      <dialog
        ref={dialogRef}
        className={`modal ${modal === "zoom" ? "image-modal" : ""}`}
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModal(null);
        }}
        aria-labelledby="dialog-title"
      >
        <button
          className="close-modal"
          onClick={() => setModal(null)}
          aria-label="关闭弹窗"
        >
          <X />
        </button>
        {modal === "privacy" && (
          <>
            <ShieldCheck size={30} />
            <h2 id="dialog-title">关于镜头，也关于安心。</h2>
            <p>当前为本地前端演示。所有画面来自随应用提供的示例素材。</p>
            <ul className="privacy-list">
              <li>
                <b>不访问你的摄像头</b>
                <span>取景与入镜状态为演示，不代表真实识别。</span>
              </li>
              <li>
                <b>不上传任何照片</b>
                <span>没有连接 AI 生成服务，不需要 API 密钥。</span>
              </li>
              <li>
                <b>仅记住当前选项</b>
                <span>当前标签页暂存选片编号；关闭标签页后清除。</span>
              </li>
              <li>
                <b>语音由你主动开启</b>
                <span>使用浏览器的系统语音，具体语音可用性依设备而异。</span>
              </li>
            </ul>
            <Button primary onClick={() => setModal(null)}>
              我知道了
              <Check />
            </Button>
          </>
        )}
        {modal === "zoom" && (
          <>
            <h2 id="dialog-title">
              {selected.name} · 照片 {selected.id}
            </h2>
            <img src={selected.src} alt={`${selected.name}完整大图`} />
            <p className="small muted">演示图片 · 未进行 AI 处理</p>
            <Button primary onClick={savePhoto} disabled={downloading}>
              <Download />
              下载示例照片
            </Button>
            {saveError && <p role="alert">下载暂时失败，请关闭弹窗后重试。</p>}
          </>
        )}
        {modal === "leave" && (
          <>
            <AlertCircle size={30} />
            <h2 id="dialog-title">要离开当前生成流程吗？</h2>
            <p>
              离开会停止这次演示任务。你已选择的照片会保留，可以稍后重新生成。
            </p>
            <div className="modal-actions">
              <Button primary onClick={() => setModal(null)}>
                继续等待
              </Button>
              <Button
                onClick={() => {
                  setModal(null);
                  setGeneration("idle");
                  go(pendingPage);
                }}
              >
                离开并保留选片
              </Button>
            </div>
          </>
        )}
      </dialog>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={20} />
          {toast}
          <button onClick={() => setToast("")} aria-label="关闭提示">
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}

function PageHeading({
  eyebrow,
  title,
  subtitle,
  back,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  back?: () => void;
}) {
  return (
    <header className="page-heading">
      <div className="eyebrow">
        <span>{eyebrow}</span>
        {back && (
          <button className="text-button" onClick={back}>
            <ArrowLeft size={16} />
            返回上一步
          </button>
        )}
      </div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  );
}
function EmptyState({ onSelect }: { onSelect: () => void }) {
  return (
    <div className="card empty-state">
      <Image size={36} />
      <h2>先选一张喜欢的照片</h2>
      <p>完成选片后，即可体验生成与保存流程。</p>
      <Button primary onClick={onSelect}>
        前往选片
        <ArrowRight />
      </Button>
    </div>
  );
}
