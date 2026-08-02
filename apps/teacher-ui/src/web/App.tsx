import React, { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  ApiErrorBody,
  CreationStatus,
  CurriculumActivityOption,
  CurriculumCatalogResponse,
  CurriculumStandardOption,
  CurriculumUnitOption,
  PreviewResponse,
  PublicActivity,
  SessionResponse
} from "../shared/contract";

type View = "desk" | "compose" | "preview" | "creating" | "done" | "failed";

interface LessonForm {
  requestedGrade: number;
  semester: 1 | 2;
  unitId: string;
  standardCode: string;
  activityId: string;
  learningNeedId: string;
  contextNote: string;
  problemCount: 1 | 2 | 4 | 6;
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

const progressMessages = [
  "활동을 만들 준비를 하고 있어요.",
  "문항과 조작 도구를 배치하고 있어요.",
  "학생이 확인할 수학적 기준을 연결하고 있어요.",
  "마지막으로 활동이 잘 작동하는지 확인하고 있어요."
];

function formForStandard(
  current: LessonForm,
  standard: CurriculumStandardOption,
  requestedActivity?: CurriculumActivityOption
): LessonForm {
  const activity =
    requestedActivity?.availability === "released"
      ? requestedActivity
      : standard.activities.find(
          (candidate) => candidate.availability === "released"
        );
  const learningNeed = activity?.learningNeeds[0];
  if (!activity || !learningNeed) {
    return {
      ...current,
      standardCode: standard.standardCode,
      activityId: "",
      learningNeedId: ""
    };
  }
  return {
    ...current,
    standardCode: standard.standardCode,
    activityId: activity.id,
    learningNeedId: learningNeed.id,
    problemCount: activity.defaultProblemCount
  };
}

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
    requestedGrade: 3,
    semester: 1,
    unitId: "",
    standardCode: "",
    activityId: "",
    learningNeedId: "",
    contextNote: "",
    problemCount: 4,
  });
  const [catalog, setCatalog] = useState<CurriculumCatalogResponse>();
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
    void api<CurriculumCatalogResponse>("/api/curriculum")
      .then((next) => {
        setCatalog(next);
        setForm((current) => {
          const unit = next.units.find(
            (candidate) =>
              candidate.grade === current.requestedGrade &&
              candidate.semester === current.semester
          );
          if (!unit) return current;
          const unitStandards = next.standards
            .filter((candidate) =>
              unit.standardCodes.includes(candidate.standardCode)
            )
            .map((candidate) => ({
              ...candidate,
              activities: candidate.activities.filter((activityOption) =>
                unit.activityIds.includes(activityOption.id)
              )
            }));
          const standard =
            unitStandards.find((candidate) =>
              candidate.activities.some(
                (activityOption) => activityOption.availability === "released"
              )
            ) ??
            unitStandards[0];
          const nextForm = { ...current, unitId: unit.id };
          return standard
            ? formForStandard(nextForm, standard)
            : { ...nextForm, standardCode: "", activityId: "", learningNeedId: "" };
        });
      })
      .catch(() => {
        setMessage("교육과정 목록을 불러오지 못했어요. 화면을 다시 열어 주세요.");
      });
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
    if (!form.standardCode || !form.activityId || !form.learningNeedId) {
      setMessage("학년, 단원, 성취기준과 학생이 어려워하는 지점을 골라 주세요.");
      return;
    }
    setRecommending(true);
    try {
      const recommendation = await api<{ card: { cardId: string } }>("/api/recommendations", {
        method: "POST",
        body: JSON.stringify(form)
      });
      const preview = await api<PreviewResponse>(
        `/api/recommendations/${recommendation.card.cardId}`,
        { method: "POST" }
      );
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
    setForm((current) => ({ ...current, contextNote: "" }));
    setActivity(undefined);
    setApprovalToken("");
    setCreation(undefined);
    setMessage("");
    setView("compose");
  };

  const gradeUnits = (catalog?.units ?? []).filter(
    (unit) =>
      unit.grade === form.requestedGrade && unit.semester === form.semester
  );
  const selectedUnit = gradeUnits.find((unit) => unit.id === form.unitId);
  const unitStandards = (catalog?.standards ?? [])
    .filter((standard) =>
      selectedUnit?.standardCodes.includes(standard.standardCode)
    )
    .map((standard) => ({
      ...standard,
      activities: standard.activities.filter((activityOption) =>
        selectedUnit?.activityIds.includes(activityOption.id)
      )
    }));
  const selectedStandard = unitStandards.find(
    (standard) => standard.standardCode === form.standardCode
  );
  const selectedActivity = selectedStandard?.activities.find(
    (activityOption) => activityOption.id === form.activityId
  );
  const selectedLearningNeed = selectedActivity?.learningNeeds.find(
    (need) => need.id === form.learningNeedId
  );

  const selectUnit = (current: LessonForm, unit: CurriculumUnitOption): LessonForm => {
    const standards = (catalog?.standards ?? [])
      .filter((candidate) =>
        unit.standardCodes.includes(candidate.standardCode)
      )
      .map((candidate) => ({
        ...candidate,
        activities: candidate.activities.filter((activityOption) =>
          unit.activityIds.includes(activityOption.id)
        )
      }));
    const standard =
      standards.find((candidate) =>
        candidate.activities.some(
          (activityOption) => activityOption.availability === "released"
        )
      ) ??
      standards[0];
    const next = { ...current, unitId: unit.id };
    return standard
      ? formForStandard(next, standard)
      : { ...next, standardCode: "", activityId: "", learningNeedId: "" };
  };

  const changeGrade = (requestedGrade: number) => {
    setForm((current) => {
      const unit = catalog?.units.find(
        (candidate) =>
          candidate.grade === requestedGrade && candidate.semester === current.semester
      );
      const next = { ...current, requestedGrade };
      return unit ? selectUnit(next, unit) : next;
    });
  };

  const changeSemester = (semester: 1 | 2) => {
    setForm((current) => {
      const unit = catalog?.units.find(
        (candidate) =>
          candidate.grade === current.requestedGrade && candidate.semester === semester
      );
      const next = { ...current, semester };
      return unit ? selectUnit(next, unit) : next;
    });
  };

  const changeUnit = (unitId: string) => {
    const unit = gradeUnits.find((candidate) => candidate.id === unitId);
    if (unit) setForm((current) => selectUnit(current, unit));
  };

  const changeStandard = (standardCode: string) => {
    const standard = unitStandards.find(
      (candidate) => candidate.standardCode === standardCode
    );
    if (standard) setForm((current) => formForStandard(current, standard));
  };

  const changeActivity = (activityId: string) => {
    const activityOption = selectedStandard?.activities.find(
      (candidate) => candidate.id === activityId
    );
    if (selectedStandard && activityOption) {
      setForm((current) =>
        formForStandard(current, selectedStandard, activityOption)
      );
    }
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
              {connection.connection === "login_pending" ? <span>로그인을 마치면 전용 창이 자동으로 닫히고 이 화면에 연결됩니다.</span> : null}
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
            <p className="eyebrow">교육과정에서 수업으로</p>
            <h1 id="compose-title" data-page-title tabIndex={-1}>학년과 단원에서 시작해 보세요.</h1>
            <p className="section-intro">실제 교과서 단원을 고르면, 연결된 성취기준과 학생들이 어려워하는 지점까지 차례로 좁혀 드립니다.</p>
            <form onSubmit={recommend}>
              <section className="builder-step" aria-labelledby="curriculum-step-title">
                <div className="builder-step-heading">
                  <span aria-hidden="true">1</span>
                  <div><h2 id="curriculum-step-title">학년·학기·단원을 골라 주세요.</h2><p>성취기준 문장을 외우거나 직접 입력하지 않아도 됩니다.</p></div>
                </div>
                <ChoiceGroup
                  label="학년"
                  value={form.requestedGrade}
                  options={[1, 2, 3, 4, 5, 6].map((value) => ({ value, label: `${value}학년` }))}
                  onChange={changeGrade}
                />
                <ChoiceGroup
                  label="학기"
                  value={form.semester}
                  options={[
                    { value: 1 as const, label: "1학기" },
                    { value: 2 as const, label: "2학기" }
                  ]}
                  onChange={changeSemester}
                />
                <div className="curriculum-select-grid">
                  <label className="select-field">
                    <span>단원</span>
                    <select value={form.unitId} onChange={(event) => changeUnit(event.target.value)} disabled={!catalog}>
                      {gradeUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.unitNumber}. {unit.title}</option>)}
                    </select>
                  </label>
                  <label className="select-field">
                    <span>성취기준</span>
                    <select value={form.standardCode} onChange={(event) => changeStandard(event.target.value)} disabled={!catalog || unitStandards.length === 0}>
                      {unitStandards.length ? unitStandards.map((standard) => {
                        const released = standard.activities.some((activityOption) => activityOption.availability === "released");
                        // 교사에게는 지금 만들 수 있는지만 알리고, 내부 검증 단계는 노출하지 않는다.
                        return <option key={standard.standardCode} value={standard.standardCode}>{standard.standardCode} {standard.focusLabel}{released ? " · 활동 있음" : " · 준비 중"}</option>;
                      }) : <option value="">연결된 성취기준 확인 중</option>}
                    </select>
                  </label>
                </div>
                {selectedStandard ? (
                  <div className="standard-card">
                    <div><span>{selectedStandard.domain}</span><strong>{form.requestedGrade}학년 {form.semester}학기 {selectedUnit?.unitNumber}. {selectedUnit?.title}</strong></div>
                    <p>{selectedStandard.standardSummary}</p>
                    <code>{selectedStandard.standardCode}</code>
                  </div>
                ) : selectedUnit ? (
                  <div className="unsupported-unit">
                    <strong>{form.requestedGrade}학년 {form.semester}학기 {selectedUnit.unitNumber}. {selectedUnit.title}</strong>
                    <p>단원 목차는 확인됐지만, 이 단원에 정확히 연결된 MathCanvas 활동은 아직 준비 중입니다.</p>
                  </div>
                ) : <div className="catalog-loading">교과서 단원 목록을 불러오고 있어요.</div>}
                {selectedUnit ? <p className="curriculum-source">비상교육 2022 개정 교재 목차 기준 · 학년군 성취기준과 교과서 단원을 분리해 연결합니다.</p> : null}
              </section>

              {selectedStandard ? (
                <section className="builder-step" aria-labelledby="focus-step-title">
                  <div className="builder-step-heading">
                    <span aria-hidden="true">2</span>
                    <div><h2 id="focus-step-title">이번 활동에서 다룰 내용을 골라 주세요.</h2><p>같은 성취기준 안에서도 수업의 초점을 한 가지로 정합니다.</p></div>
                  </div>
                  {selectedStandard.activities.some((activityOption) => activityOption.availability === "released") ? (
                    <fieldset className="card-choice-group">
                      <legend className="sr-only">활동 초점</legend>
                      <div className="activity-option-grid">
                        {selectedStandard.activities.filter((activityOption) => activityOption.availability === "released").map((activityOption) => (
                          <label key={activityOption.id} className={form.activityId === activityOption.id ? "activity-option is-selected" : "activity-option"}>
                            <input type="radio" name="활동 초점" value={activityOption.id} checked={form.activityId === activityOption.id} onChange={() => changeActivity(activityOption.id)} />
                            <span className="option-check" aria-hidden="true">✓</span>
                            <strong>{activityOption.label}</strong>
                            <small>{activityOption.description}</small>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ) : (
                    <div className="unsupported-activity">
                      <strong>{selectedStandard.focusLabel} 활동은 아직 준비 중입니다.</strong>
                      <p>다른 활동 초점을 고르시거나, 같은 단원의 다른 성취기준을 살펴봐 주세요.</p>
                    </div>
                  )}
                </section>
              ) : null}

              {selectedActivity ? (
                <section className="builder-step" aria-labelledby="need-step-title">
                  <div className="builder-step-heading">
                    <span aria-hidden="true">3</span>
                    <div><h2 id="need-step-title">학생들이 어디에서 막히나요?</h2><p>우리 반 학생에게 가장 가까운 모습을 하나 골라 주세요.</p></div>
                  </div>
                  <fieldset className="card-choice-group">
                    <legend className="sr-only">학생이 어려워하는 지점</legend>
                    <div className="need-option-grid">
                      {selectedActivity.learningNeeds.map((need) => (
                        <label key={need.id} className={form.learningNeedId === need.id ? "need-option is-selected" : "need-option"}>
                          <input type="radio" name="학생이 어려워하는 지점" value={need.id} checked={form.learningNeedId === need.id} onChange={() => setForm({ ...form, learningNeedId: need.id })} />
                          <span className="option-check" aria-hidden="true">✓</span>
                          <strong>{need.label}</strong>
                          <small>{need.description}</small>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="context-field">
                    <span>우리 반 상황 더하기 <em>선택</em></span>
                    <textarea value={form.contextNote} maxLength={500} onChange={(event) => setForm({ ...form, contextNote: event.target.value })} placeholder="예) 계산은 할 수 있지만 친구에게 왜 그런지 설명하는 것을 어려워해요." aria-describedby="context-help" />
                    <small id="context-help"><span>선택한 내용에 덧붙일 말이 있을 때만 적어 주세요.</span><span>{form.contextNote.length}/500</span></small>
                  </label>
                </section>
              ) : null}

              {selectedActivity ? (
                <details className="detail-settings">
                  <summary>세부 설정 <span>필요할 때만 바꾸세요</span></summary>
                  <ChoiceGroup
                    label="활동 문항 수"
                    value={form.problemCount}
                    options={selectedActivity.availableProblemCounts.map((value) => ({ value, label: `${value}문항` }))}
                    onChange={(problemCount) => setForm({ ...form, problemCount })}
                  />
                </details>
              ) : null}
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
                <button className="button primary" type="submit" disabled={recommending || !selectedLearningNeed}>{recommending ? "구성하는 중…" : "이 내용으로 활동 추천받기"}</button>
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
                <span>{activity.gradeLabel}</span><span>{activity.unitTitle}</span><span>{activity.standardCode}</span><span>{activity.problemCount}문항</span>
              </div>
            </div>
            <div className="goal-note">
              <span>{activity.activityLabel} · 학생이 어려워하는 지점: {activity.learningNeedLabel}</span>
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
