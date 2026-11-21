import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import {
  createOneOnOneTestSession,
  type CallTestSessionCreated,
} from "../../features/sessions/api";

type Props = {
  selectedDate: Date;
  onCreated: (createdDate: Date) => void;
};

const pad = (value: number) => String(value).padStart(2, "0");
const dateInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const timeLabel = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

/** 지금부터 몇 분 뒤 (5분 단위로 올림) */
function soon(minutes: number) {
  const date = new Date(Date.now() + minutes * 60_000);
  date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5, 0, 0);
  return date;
}

const initialForm = (selectedDate: Date) => {
  const start = soon(15);
  const sameDay = dateInputValue(selectedDate) === dateInputValue(new Date());
  return {
    partnerEmail: "",
    date: sameDay ? dateInputValue(start) : dateInputValue(selectedDate),
    time: sameDay ? `${pad(start.getHours())}:${pad(start.getMinutes())}` : "21:00",
  };
};

/**
 * 운영자 전용: 나와 다른 운영자 한 명만 들어가는 1:1 통화 테스트 세션을 만든다.
 * 참가비 없음, 한 라운드(3분) 대화 → 투표 → 결과. 시작 3분 전부터 두 사람만 입장할 수 있다.
 */
export default function AdminOneOnOneTestCreate({ selectedDate, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => initialForm(selectedDate));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CallTestSessionCreated | null>(null);
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
    setCreated(null);
    setOpen(true);
  }

  function close() {
    if (!submitting) setOpen(false);
  }

  const update =
    (key: keyof ReturnType<typeof initialForm>) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    // 한국 시간으로 입력받는다
    const startTime = `${form.date}T${form.time}:00+09:00`;
    if (new Date(startTime).getTime() <= Date.now() + 60_000) {
      setError("시작 시각은 지금부터 1분 이후여야 해요.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await createOneOnOneTestSession(form.partnerEmail.trim(), startTime);
      setCreated(result);
      onCreated(new Date(`${form.date}T00:00:00`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "테스트 세션을 만들지 못했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Styles>
      <button ref={trigger} type="button" className="test-add-button" onClick={openDialog}>
        + 1:1 테스트 세션 (운영자만)
      </button>

      {open && (
        <dialog
          ref={dialog}
          className="test-dialog"
          aria-labelledby="one-on-one-title"
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          {created ? (
            <div className="test-form">
              <h2 id="one-on-one-title">테스트 세션을 만들었어요</h2>
              <p className="hint">
                세션 #{created.sessionId} · {timeLabel(created.startTime)} 시작
              </p>
              <p className="hint">
                시작 3분 전부터 나와 상대 운영자의 홈 화면에서 입장할 수 있어요. 다른 회원에게는
                보이지 않아요.
              </p>
              <div className="actions single">
                <button type="button" className="confirm" onClick={close}>
                  확인
                </button>
              </div>
            </div>
          ) : (
            <form className="test-form" onSubmit={(event) => void submit(event)}>
              <h2 id="one-on-one-title">1:1 테스트 세션</h2>
              <p className="hint">
                나와 상대 운영자 둘만 3분 대화 → 투표 → 결과까지 진행해요. 참가비는 없고, 두
                계정 모두 운영자여야 해요. 시간은 한국 시간이에요.
              </p>
              <label>
                상대 운영자 이메일
                <input
                  type="email"
                  required
                  autoComplete="off"
                  placeholder="admin@example.ac.kr"
                  value={form.partnerEmail}
                  onChange={update("partnerEmail")}
                />
              </label>
              <div className="row">
                <label>
                  날짜
                  <input type="date" required value={form.date} onChange={update("date")} />
                </label>
                <label>
                  시작 시각
                  <input type="time" required value={form.time} onChange={update("time")} />
                </label>
              </div>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <div className="actions">
                <button type="button" className="cancel" disabled={submitting} onClick={close}>
                  닫기
                </button>
                <button type="submit" className="confirm" disabled={submitting}>
                  {submitting ? "만드는 중…" : "만들기"}
                </button>
              </div>
            </form>
          )}
        </dialog>
      )}
    </Styles>
  );
}

const Styles = styled.div`
  .test-add-button {
    width: 100%;
    margin-top: 1rem;
    min-height: 4.4rem;
    border: 0.1rem dashed #8b959b;
    border-radius: 1.6rem;
    background: var(--white);
    color: #536057;
    font: 600 1.3rem var(--font-body);
  }
  .test-add-button:hover {
    background: #f2f5ef;
  }
  .test-dialog {
    padding: 0;
    border: 0;
    border-radius: 2.9rem;
    width: min(36rem, calc(100vw - 3.2rem));
    max-height: calc(100dvh - 4rem);
    background: var(--background);
    color: var(--ink);
    box-shadow: 0 1.6rem 7rem #1113;
  }
  .test-dialog::backdrop {
    background: #222b2566;
  }
  .test-form {
    display: grid;
    gap: 1.2rem;
    padding: 2.8rem 2rem 2rem;
  }
  h2 {
    text-align: center;
    font: 700 1.9rem/1.4 var(--font-body);
  }
  .hint {
    text-align: center;
    color: #8b959b;
    font-size: 1.15rem;
    line-height: 1.6;
  }
  label {
    display: grid;
    gap: 0.5rem;
    min-width: 0;
    color: var(--text-secondary);
    font-size: 1.2rem;
  }
  input {
    width: 100%;
    min-height: 4rem;
    padding: 0 1rem;
    border: 0.1rem solid #e3e8df;
    border-radius: 1rem;
    background: var(--white);
    color: var(--ink);
    font: 1.4rem var(--font-body);
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
  }
  .error {
    color: var(--text-danger);
    font-size: 1.2rem;
    line-height: 1.5;
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.9rem;
    margin-top: 0.4rem;
  }
  .actions.single {
    grid-template-columns: 1fr;
  }
  .actions button {
    min-height: 3.9rem;
    border-radius: 1.3rem;
    font: 600 1.2rem var(--font-body);
  }
  .actions .cancel {
    background: transparent;
    border: 0.1rem solid #e3e8df;
    color: #85908b;
    font-weight: 500;
  }
  .actions .confirm {
    background: var(--green);
    border: 0;
  }
  .actions button:disabled {
    opacity: 0.65;
  }
`;
