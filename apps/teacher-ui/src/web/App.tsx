import React, { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  ApiErrorBody,
  CreationStatus,
  PreviewResponse,
  PublicActivity,
  SessionResponse
} from "../shared/contract";

type View = "desk" | "compose" | "preview" | "creating" | "done" | "failed";
type Difficulty = "easy" | "normal" | "hard";

interface LessonForm {
  prompt: string;
  requestedGrade: number;
  problemCount: number;
  difficulty: Difficulty;
}

class ApiClientError extends Error {
  public constructor(public readonly body: ApiErrorBody) {
    super(body.message);
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? "GET";
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(method === "GET" ? {} : { "x-mathcanvas-ui": "1" }),
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers
    }
  });
  const body = (await response.json()) as T | ApiErrorBody;
  if (!response.ok) throw new ApiClientError(body as ApiErrorBody);
  return body as T;
}

const difficultyOptions: Array<{ value: Difficulty; label: string; note: string }> = [
  { value: "easy", label: "기초", note: "개념을 처음 익혀요" },
  { value: "normal", label: "보통", note: "이유까지 설명해요" },
  { value: "hard", label: "도전", note: "낯선 경우에도 적용해요" }
];

const progressMessages = [
  "활동을 만들 준비를 하고 있어요.",
  "문항과 조작 도구를 배치하고 있어요.",
  "학생이 확인할 수학적 기준을 연결하고 있어요.",
  "마지막으로 활동이 잘 작동하는지 확인하고 있어요."
];

function StepDots({ step }: { step: number }) {
  const labels = ["준비", "수업 입력", "내용 확인", "만들기"];
  return (
    <ol className="step-dots" aria-label="활동 만들기 진행 단계">
      {labels.map((label, index) => (
        <li key={label} className={index + 1 <= step ? "is-active" : ""}>
          <span aria-hidden="true">{index + 1}</span>
          <span className="sr-only">{label}{index + 1 === step ? " 현재 단계" : ""}</span>
        </li>
      ))}
    </ol>
  );
}

function Header({ step }: { step: number }) {
  return (
    <header className="topbar">
      <a className="brand" href="/" aria-label="MathCanvas 수업 준비 책상 처음으로">
        <span className="brand-mark" aria-hidden="true">M</span>
        <span className="brand-name">MATH CANVAS</span>
        <span className="brand-divider" aria-hidden="true" />
        <span className="brand-service">수업 준비</span>
      </a>
      <StepDots step={step} />
    </header>
  );
}

function StatusPill({ connection }: { connection: SessionResponse["connection"] }) {
  const text = {
    ready: "준비됨",
    login_required: "로그인 필요",
    login_pending: "로그인 확인 중",
    busy: "다른 작업 사용 중",
    disconnected: "연결 확인 필요"
  }[connection];
  return <span className={`status-pill status-${connection}`}><span aria-hidden="true" />{text}</span>;
}

function ChoiceGroup<T extends string | number>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; note?: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="choice-group">
      <legend>{label}</legend>
      <div className="choice-grid">
        {options.map((option) => (
          <label key={String(option.value)} className={value === option.value ? "choice is-selected" : "choice"}>
            <input
              type="radio"
              name={label}
              value={String(option.value)}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <strong>{option.label}</strong>
            {option.note ? <small>{option.note}</small> : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ConfirmDialog({ title, onCancel, onConfirm }: { title: string; onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => cancelRef.current?.focus(), []);
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel();
    }}>
      <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}>
        <span className="paperclip" aria-hidden="true" />
        <p className="eyebrow">마지막 확인</p>
        <h2 id="confirm-title">‘{title}’ 활동을 만들까요?</h2>
        <ul>
          <li>새 활동으로 만들어집니다.</li>
          <li>지금 있는 활동은 바뀌지 않습니다.</li>
          <li>완료될 때까지 잠시 기다려 주세요.</li>
        </ul>
        <div className="dialog-actions">
          <button ref={cancelRef} className="button secondary" type="button" onClick={onCancel}>조금 더 볼게요</button>
          <button className="button primary" type="button" onClick={onConfirm}>네, 만들게요</button>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const [view, setView] = useState<View>("desk");
  const [connection, setConnection] = useState<SessionResponse>({
    connection: "disconnected",
    message: "MathCanvas 연결을 확인하고 있어요."
  });
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState<LessonForm>({
    prompt: "",
    requestedGrade: 4,
    problemCount: 4,
    difficulty: "normal"
  });
  const [recommending, setRecommending] = useState(false);
  const [activity, setActivity] = useState<PublicActivity>();
  const [approvalToken, setApprovalToken] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [creation, setCreation] = useState<CreationStatus>();
  const [progressIndex, setProgressIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [hints, setHints] = useState<string[]>([]);

  const refreshConnection = async () => {
    setChecking(true);
    try {
      const next = await api<SessionResponse>("/api/session");
      setConnection(next);
    } catch (caught) {
      setConnection({
        connection: "disconnected",
        message: caught instanceof Error ? caught.message : "연결을 확인하지 못했어요."
      });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void refreshConnection();
  }, []);

  useEffect(() => {
    document.querySelector<HTMLElement>("[data-page-title]")?.focus();
  }, [view]);

  useEffect(() => {
    if (connection.connection !== "login_pending") return;
    const timer = window.setInterval(() => void refreshConnection(), 3000);
    return () => window.clearInterval(timer);
  }, [connection.connection]);

  useEffect(() => {
    if (view !== "creating") return;
    const timer = window.setInterval(() => {
      setProgressIndex((index) => (index + 1) % progressMessages.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [view]);

  useEffect(() => {
    if (view !== "creating" || !creation) return;
    const timer = window.setInterval(async () => {
      try {
        const next = await api<CreationStatus>(`/api/creations/${creation.creationId}`);
        setCreation(next);
        if (next.status === "succeeded") setView("done");
        if (next.status === "failed") setView("failed");
      } catch (caught) {
        setMessage(caught instanceof Error ? caught.message : "생성 상태를 확인하지 못했어요.");
      }
    }, document.hidden ? 5000 : 1500);
    return () => window.clearInterval(timer);
  }, [view, creation?.creationId]);

  const openLogin = async () => {
    setChecking(true);
    try {
      setConnection(await api<SessionResponse>("/api/session/open-login", { method: "POST" }));
    } catch (caught) {
      setConnection({
        connection: "disconnected",
        message: caught instanceof Error ? caught.message : "로그인 창을 열지 못했어요."
      });
    } finally {
      setChecking(false);
    }
  };

  const recommend = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    setHints([]);
    if (form.prompt.trim().length < 5) {
      setMessage("가르칠 개념과 학생이 어려워하는 지점을 한 문장 이상 적어 주세요.");
      return;
    }
    setRecommending(true);
    try {
      const recommendation = await api<{ card: { cardId: string } }>("/api/recommendations", {
        method: "POST",
        body: JSON.stringify(form)
      });
      const preview = await api<PreviewResponse>(`/api/recommendations/${recommendation.card.cardId}`);
      setActivity(preview.activity);
      setApprovalToken(preview.approvalToken);
      setView("preview");
    } catch (caught) {
      if (caught instanceof ApiClientError) {
        setMessage(caught.body.message);
        setHints(caught.body.hints ?? []);
      } else {
        setMessage("활동을 추천받지 못했어요. 잠시 뒤 다시 시도해 주세요.");
      }
    } finally {
      setRecommending(false);
    }
  };

  const createActivity = async () => {
    if (!activity) return;
    setShowConfirm(false);
    setMessage("");
    try {
      const next = await api<CreationStatus>("/api/creations", {
        method: "POST",
        body: JSON.stringify({ cardId: activity.cardId, approvalToken })
      });
      setCreation(next);
      setProgressIndex(0);
      setView("creating");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "활동 만들기를 시작하지 못했어요.");
      setView("failed");
    }
  };

  const startAnother = () => {
    setForm((current) => ({ ...current, prompt: "" }));
    setActivity(undefined);
    setApprovalToken("");
    setCreation(undefined);
    setMessage("");
    setView("compose");
  };

  const step = view === "desk" ? 1 : view === "compose" ? 2 : view === "preview" ? 3 : 4;

  return (
    <div className="app-shell">
      <Header step={step} />
      <main className="desk-surface">
        {view === "desk" ? (
          <section className="paper welcome-paper" aria-labelledby="desk-title">
            <span className="paperclip" aria-hidden="true" />
            <div className="paper-heading">
              <p className="eyebrow">오늘의 수업 준비</p>
              <StatusPill connection={connection.connection} />
            </div>
            <h1 id="desk-title" data-page-title tabIndex={-1}>
              학생이 생각하고 확인하는<br />수학 활동을 준비해 보세요.
            </h1>
            <p className="lead">
              수업에서 가르칠 내용과 학생이 자주 하는 실수를 알려주시면,<br className="wide-only" />
              직접 조작하고 이유를 설명하는 활동으로 구성해 드립니다.
            </p>
            <div className={`connection-note note-${connection.connection}`} aria-live="polite">
              <strong>{checking ? "연결을 확인하고 있어요." : connection.message}</strong>
              {connection.connection === "login_pending" ? <span>로그인한 뒤 전용 창을 닫으면 이 화면에서 자동으로 확인합니다.</span> : null}
            </div>
            <div className="actions">
              {connection.connection === "ready" && !checking ? (
                <button className="button primary" type="button" onClick={() => setView("compose")}>수업 준비 시작하기</button>
              ) : connection.connection === "login_required" ? (
                <button className="button primary" type="button" onClick={() => void openLogin()} disabled={checking}>로그인 창 열기</button>
              ) : (
                <button className="button secondary" type="button" onClick={() => void refreshConnection()} disabled={checking}>{checking ? "확인 중…" : "다시 확인하기"}</button>
              )}
            </div>
          </section>
        ) : null}

        {view === "compose" ? (
          <section className="paper compose-paper" aria-labelledby="compose-title">
            <button className="back-button" type="button" onClick={() => setView("desk")}>← 처음으로</button>
            <p className="eyebrow">수업 한 장으로 정리하기</p>
            <h1 id="compose-title" data-page-title tabIndex={-1}>어떤 수업을 준비하시나요?</h1>
            <p className="section-intro">정답만 맞히는 활동보다, 학생이 무엇을 오해하는지 알려주면 더 좋은 활동을 만들 수 있어요.</p>
            <form onSubmit={recommend}>
              <label className="prompt-field">
                <span>가르칠 내용과 학생이 어려워하는 점</span>
                <textarea
                  value={form.prompt}
                  maxLength={1000}
                  onChange={(event) => setForm({ ...form, prompt: event.target.value })}
                  placeholder="예) 4학년 학생들이 분모가 다르면 분자끼리 바로 더해도 된다고 생각해요. 같은 크기의 단위로 바꿔야 한다는 것을 스스로 발견하게 하고 싶어요."
                  aria-describedby="prompt-help"
                />
                <small id="prompt-help">수학 개념 + 학생이 자주 하는 생각 + 수업에서 바라는 변화를 적어 주세요. <span>{form.prompt.length}/1000</span></small>
              </label>
              <div className="choice-columns">
                <ChoiceGroup
                  label="학년"
                  value={form.requestedGrade}
                  options={[1, 2, 3, 4, 5, 6].map((value) => ({ value, label: `${value}학년` }))}
                  onChange={(requestedGrade) => setForm({ ...form, requestedGrade })}
                />
                <ChoiceGroup
                  label="문항 수"
                  value={form.problemCount}
                  options={[2, 4, 6].map((value) => ({ value, label: `${value}문항` }))}
                  onChange={(problemCount) => setForm({ ...form, problemCount })}
                />
              </div>
              <ChoiceGroup
                label="생각의 깊이"
                value={form.difficulty}
                options={difficultyOptions}
                onChange={(difficulty) => setForm({ ...form, difficulty })}
              />
              {message ? (
                <div className="error-panel" role="alert">
                  <strong>{message}</strong>
                  {hints.length ? <ul>{hints.map((hint) => <li key={hint}>{hint}</li>)}</ul> : null}
                </div>
              ) : null}
              <div className="form-footer">
                {recommending ? (
                  <div className="working-note" aria-live="polite">
                    <span className="pencil" aria-hidden="true">✎</span>
                    <span><strong>수업에 맞는 활동을 찾고 있어요.</strong> 학생이 고민할 지점과 확인 방법을 함께 살펴보고 있습니다.</span>
                  </div>
                ) : null}
                <button className="button primary" type="submit" disabled={recommending}>{recommending ? "구성하는 중…" : "활동 추천받기"}</button>
              </div>
            </form>
          </section>
        ) : null}

        {view === "preview" && activity ? (
          <section className="paper preview-paper" aria-labelledby="preview-title">
            <button className="back-button" type="button" onClick={() => setView("compose")}>← 수업 내용 고치기</button>
            <div className="preview-heading">
              <div>
                <p className="eyebrow">추천 활동</p>
                <h1 id="preview-title" data-page-title tabIndex={-1}>{activity.title}</h1>
              </div>
              <div className="meta-stamps" aria-label="활동 조건">
                <span>{activity.gradeLabel}</span><span>{activity.problemCount}문항</span><span>{activity.difficultyLabel}</span>
              </div>
            </div>
            <div className="goal-note">
              <span>학습 목표</span>
              <strong>{activity.learningGoal}</strong>
              <p>{activity.summary}</p>
            </div>

            <section className="preview-section" aria-labelledby="flow-title">
              <div className="section-label"><span>01</span><h2 id="flow-title">학생의 생각이 이렇게 깊어집니다</h2></div>
              <ol className="flow-strip">
                {activity.flow.map((flow) => (
                  <li key={flow.number}>
                    <span className="flow-number">{flow.number}</span>
                    <strong>{flow.label}</strong>
                    <p>{flow.description}</p>
                  </li>
                ))}
              </ol>
            </section>

            <div className="preview-columns">
              <section className="preview-section" aria-labelledby="student-view-title">
                <div className="section-label"><span>02</span><h2 id="student-view-title">학생에게 보이는 활동 안내</h2></div>
                {activity.studentInstructions.length ? (
                  <ol className="instruction-list">
                    {activity.studentInstructions.map((instruction) => <li key={instruction}>{instruction}</li>)}
                  </ol>
                ) : <p className="empty-copy">조작 순서와 설명 문항이 활동 안에 함께 구성됩니다.</p>}
              </section>
              <section className="preview-section teacher-note" aria-labelledby="teacher-check-title">
                <div className="section-label"><span>03</span><h2 id="teacher-check-title">수업에서 살펴볼 점</h2></div>
                <ul>
                  {(activity.teacherChecks.length ? activity.teacherChecks : [
                    "학생이 답을 고른 근거를 수나 식으로 설명하는지 살펴보세요.",
                    "조작 결과가 예상과 다를 때 처음 생각을 스스로 고치는지 살펴보세요."
                  ]).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>
            </div>
            <div className="preview-footer">
              <p><strong>안심하세요.</strong> 새 활동만 만들며, 지금 있는 활동은 바꾸지 않습니다.</p>
              <button className="button primary" type="button" onClick={() => setShowConfirm(true)}>이 활동으로 만들기</button>
            </div>
            {showConfirm ? <ConfirmDialog title={activity.title} onCancel={() => setShowConfirm(false)} onConfirm={() => void createActivity()} /> : null}
          </section>
        ) : null}

        {view === "creating" ? (
          <section className="paper result-paper" aria-labelledby="creating-title">
            <span className="paperclip" aria-hidden="true" />
            <div className="making-mark" aria-hidden="true"><span>✎</span></div>
            <p className="eyebrow">MathCanvas 활동 만드는 중</p>
            <h1 id="creating-title" data-page-title tabIndex={-1}>수업에 바로 쓸 수 있도록<br />활동을 만들고 있어요.</h1>
            <div className="progress-track" aria-hidden="true"><span /></div>
            <p className="progress-message" aria-live="polite">{progressMessages[progressIndex]}</p>
            <p className="quiet-copy">이 화면을 잠시 다른 곳에 두어도 작업은 계속됩니다.</p>
          </section>
        ) : null}

        {view === "done" && creation ? (
          <section className="paper result-paper success-paper" aria-labelledby="done-title">
            <span className="paperclip" aria-hidden="true" />
            <div className="success-mark" aria-hidden="true">✓</div>
            <p className="eyebrow">준비 완료</p>
            <h1 id="done-title" data-page-title tabIndex={-1}>활동이 만들어졌어요.</h1>
            <p className="lead">{activity?.title}<br />학생과 함께 직접 움직이고, 확인하고, 설명해 보세요.</p>
            <div className="actions split-actions">
              {creation.editorUrl ? <a className="button primary" href={creation.editorUrl} target="_blank" rel="noreferrer">MathCanvas에서 활동 열기</a> : null}
              <button className="button secondary" type="button" onClick={startAnother}>다른 수업 준비하기</button>
            </div>
          </section>
        ) : null}

        {view === "failed" ? (
          <section className="paper result-paper failure-paper" aria-labelledby="failed-title">
            <span className="paperclip" aria-hidden="true" />
            <div className="failure-mark" aria-hidden="true">!</div>
            <p className="eyebrow">안전하게 멈춤</p>
            <h1 id="failed-title" data-page-title tabIndex={-1}>활동을 만들지 못했어요.</h1>
            <p className="lead">{creation?.message ?? message}<br />기존 MathCanvas 활동은 바뀌지 않았습니다.</p>
            <div className="actions split-actions">
              <button className="button primary" type="button" onClick={() => {
                setView("preview");
                setShowConfirm(false);
              }}>내용 다시 확인하기</button>
              <button className="button secondary" type="button" onClick={() => setView("compose")}>수업 내용 고치기</button>
            </div>
          </section>
        ) : null}
      </main>
      <footer className="site-footer">MathCanvas AI · 교사의 판단 뒤에만 새 활동을 만듭니다.</footer>
    </div>
  );
}
