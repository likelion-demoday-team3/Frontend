import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { createSession, openSessionRecruiting } from "../../features/sessions/api";

type AdminSessionCreateProps = {
  selectedDate: Date;
  onCreated: () => void;
};

// 서버 규칙: 성별 정원 3~6명, 완주 반환 ≤ 참가비, 신청 마감(시작 30분 전) 이후엔 모집 시작 불가
const MIN_CAPACITY = 3;
const MAX_CAPACITY = 6;
const APPLY_DEADLINE_MINUTES = 30;

const pad = (value: number) => String(value).padStart(2, "0");
const dateInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const initialForm = (selectedDate: Date) => ({
  date: dateInputValue(selectedDate),
  time: "21:00",
  capacityPerGender: 4,
  entryFeeGem: 10,
  completionRefundGem: 5,
  roundMinutes: 10,
  votingMinutes: 3,
  resultMinutes: 5,
});

export default function AdminSessionCreate({
  selectedDate,
  onCreated,
}: AdminSessionCreateProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => initialForm(selectedDate));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      trigger.current?.focus();
    };
  }, [open]);

  function openDialog() {
    setForm(initialForm(selectedDate));
    setError("");
    setOpen(true);
  }

  function close() {
    if (!submitting) setOpen(false);
  }

  const update =
    (key: keyof ReturnType<typeof initialForm>) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        event.target.type === "number"
          ? Number(event.target.value)
          : event.target.value;
      setForm((current) => ({ ...current, [key]: value }));
    };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    // 세션 시각은 한국 시간 기준으로 보여주므로 입력값도 +09:00으로 보낸다
    const startTime = `${form.date}T${form.time}:00+09:00`;
    if (
      new Date(startTime).getTime() <=
      Date.now() + APPLY_DEADLINE_MINUTES * 60_000
    ) {
      setError(`시작 시각은 지금부터 ${APPLY_DEADLINE_MINUTES}분 이후여야 해요.`);
      return;
    }
    if (form.completionRefundGem > form.entryFeeGem) {
      setError("보증금은 참가비보다 클 수 없어요.");
      return;
    }

    setSubmitting(true);
    setError("");
    let createdId: number | null = null;
    try {
      createdId = await createSession({
        startTime,
        capacityPerGender: form.capacityPerGender,
        roundDurationSeconds: form.roundMinutes * 60,
        votingDurationSeconds: form.votingMinutes * 60,
        resultAndShareDurationSeconds: form.resultMinutes * 60,
        entryFeeGem: form.entryFeeGem,
        completionRefundGem: form.completionRefundGem,
      });
      await openSessionRecruiting(createdId);
      setOpen(false);
      onCreated();
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "세션을 만들지 못했어요.";
      setError(
        createdId === null
          ? message
          : `세션(#${createdId})은 만들었지만 모집을 시작하지 못했어요. ${message}`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminStyles>
      <button
        ref={trigger}
        type="button"
        className="admin-add-button"
        onClick={openDialog}
      >
        + 세션 추가하기
      </button>

      {open && (
        <dialog
          ref={dialog}
          className="admin-dialog"
          aria-labelledby="admin-session-title"
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <form className="admin-form" onSubmit={(event) => void submit(event)}>
            <h2 id="admin-session-title">세션 추가하기</h2>
            <p className="admin-hint">
              만들면 바로 모집이 시작돼요. 시간은 한국 시간 기준이에요.
            </p>
            <div className="field-row">
              <label>
                날짜
                <input type="date" required value={form.date} onChange={update("date")} />
              </label>
              <label>
                시작 시각
                <input type="time" required value={form.time} onChange={update("time")} />
              </label>
            </div>
            <label>
              성별 정원 ({MIN_CAPACITY}~{MAX_CAPACITY}명)
              <input
                type="number"
                required
                min={MIN_CAPACITY}
                max={MAX_CAPACITY}
                value={form.capacityPerGender}
                onChange={update("capacityPerGender")}
              />
            </label>
            <div className="field-row">
              <label>
                참가비(보석)
                <input type="number" required min={0} value={form.entryFeeGem} onChange={update("entryFeeGem")} />
              </label>
              <label>
                보증금(보석)
                <input type="number" required min={0} value={form.completionRefundGem} onChange={update("completionRefundGem")} />
              </label>
            </div>
            <div className="field-row three">
              <label>
                라운드(분)
                <input type="number" required min={1} value={form.roundMinutes} onChange={update("roundMinutes")} />
              </label>
              <label>
                투표(분)
                <input type="number" required min={1} value={form.votingMinutes} onChange={update("votingMinutes")} />
              </label>
              <label>
                결과·공유(분)
                <input type="number" required min={1} value={form.resultMinutes} onChange={update("resultMinutes")} />
              </label>
            </div>
            {error && (
              <p className="admin-error" role="alert">
                {error}
              </p>
            )}
            <div className="admin-actions">
              <button type="button" className="cancel-button" disabled={submitting} onClick={close}>
                닫기
              </button>
              <button type="submit" className="confirm-button" disabled={submitting}>
                {submitting ? "만드는 중…" : "만들기"}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </AdminStyles>
  );
}

const AdminStyles = styled.div`
  .admin-add-button {
    width: 100%;
    margin-top: 2rem;
    min-height: 4.4rem;
    border: 0.1rem dashed var(--ink);
    border-radius: 1.6rem;
    background: var(--white);
    color: var(--ink);
    font: 600 1.4rem var(--font-body);
  }
  .admin-add-button:hover {
    background: #eff8d7;
  }
  .admin-dialog {
    padding: 0;
    border: 0;
    border-radius: 2.9rem;
    width: min(36rem, calc(100vw - 3.2rem));
    max-height: calc(100dvh - 4rem);
    background: var(--background);
    color: var(--ink);
    box-shadow: 0 1.6rem 7rem #1113;
  }
  .admin-dialog::backdrop {
    background: #222b2566;
  }
  .admin-form {
    display: grid;
    gap: 1.2rem;
    padding: 2.8rem 2rem 2rem;
  }
  .admin-form h2 {
    text-align: center;
    font: 700 1.9rem/1.4 var(--font-body);
  }
  .admin-hint {
    text-align: center;
    color: #8b959b;
    font-size: 1.1rem;
    line-height: 1.6;
  }
  .admin-form label {
    display: grid;
    gap: 0.5rem;
    min-width: 0;
    color: var(--text-secondary);
    font-size: 1.2rem;
  }
  .admin-form input {
    width: 100%;
    min-height: 4rem;
    padding: 0 1rem;
    border: 0.1rem solid #e3e8df;
    border-radius: 1rem;
    background: var(--white);
    color: var(--ink);
    font: 1.4rem var(--font-body);
  }
  .field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
  }
  .field-row.three {
    grid-template-columns: repeat(3, 1fr);
  }
  .admin-error {
    color: var(--text-danger);
    font-size: 1.2rem;
    line-height: 1.5;
  }
  .admin-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.9rem;
    margin-top: 0.4rem;
  }
  .admin-actions button {
    min-height: 3.9rem;
    border-radius: 1.3rem;
    font-size: 1.2rem;
  }
  .admin-actions .cancel-button {
    background: transparent;
    border: 0.1rem solid #e3e8df;
    color: #85908b;
    font-family: var(--font-body);
    font-weight: 500;
  }
  .admin-actions .confirm-button {
    background: var(--green);
    border: 0;
    font-family: var(--font-body);
    font-weight: 600;
  }
  .admin-actions button:disabled {
    opacity: 0.65;
  }
`;
