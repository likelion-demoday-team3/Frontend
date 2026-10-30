import { useState } from "react";
import styled from "styled-components";
import type { Session } from "../../features/sessions/types";

type CalenderProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  sessions: Session[];
};

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
function koreaDateKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (name: string) =>
    parts.find((item) => item.type === name)?.value;
  return `${part("year")}-${Number(part("month"))}-${Number(part("day"))}`;
}

export function getToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (name: string) =>
    Number(parts.find((item) => item.type === name)?.value);
  return new Date(part("year"), part("month") - 1, part("day"));
}

function Icon({ direction }: { direction: "left" | "right" }) {
  const path = direction === "left" ? "m15 4-8 8 8 8" : "m9 4 8 8-8 8";
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export default function Calender({
  selectedDate,
  onSelectDate,
  sessions,
}: CalenderProps) {
  const [today] = useState(getToday);
  const [month, setMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [choosingMonth, setChoosingMonth] = useState(false);
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const cellCount = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const scheduledDates = new Set(
    sessions.map((session) => koreaDateKey(session.startTime)),
  );

  function changeMonth(offset: number) {
    setMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  return (
    <CalendarStyles>
      <div className="section-heading">
        <div className="heading-copy">
          <h1>예약하기</h1>
        </div>
        <button
          className={`icon-button calendar-toggle ${calendarOpen ? "expanded" : ""}`}
          aria-label={calendarOpen ? "달력 접기" : "달력 펼치기"}
          aria-expanded={calendarOpen}
          aria-controls="booking-calendar"
          onClick={() => setCalendarOpen(!calendarOpen)}
        >
          <Icon direction="right" />
        </button>
      </div>

      {calendarOpen && (
        <section
          className="calendar"
          id="booking-calendar"
          aria-label="날짜 선택"
        >
          <div className="calendar-heading">
            <button
              className="icon-button"
              aria-label={choosingMonth ? "이전 연도" : "이전 달"}
              onClick={() => changeMonth(choosingMonth ? -12 : -1)}
            >
              <Icon direction="left" />
            </button>
            <h2 aria-live="polite">
              {choosingMonth ? (
                `${month.getFullYear()}년`
              ) : (
                <button
                  className="calendar-title"
                  type="button"
                  aria-label={`${month.getFullYear()}년 ${String(month.getMonth() + 1).padStart(2, "0")}월, 월 선택 열기`}
                  onClick={() => setChoosingMonth(true)}
                >
                  {month.getFullYear()}년{" "}
                  {String(month.getMonth() + 1).padStart(2, "0")}월
                </button>
              )}
            </h2>
            <button
              className="icon-button"
              aria-label={choosingMonth ? "다음 연도" : "다음 달"}
              onClick={() => changeMonth(choosingMonth ? 12 : 1)}
            >
              <Icon direction="right" />
            </button>
          </div>
          {choosingMonth ? (
            <div className="month-grid" aria-label="월 선택">
              {Array.from({ length: 12 }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  className={`month-option ${today.getFullYear() === month.getFullYear() && today.getMonth() === index ? "current" : ""} ${month.getMonth() === index ? "selected" : ""}`}
                  aria-pressed={month.getMonth() === index}
                  onClick={() => {
                    setMonth(new Date(month.getFullYear(), index, 1));
                    setChoosingMonth(false);
                  }}
                >
                  {index + 1}월
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="weekdays" aria-hidden="true">
                {weekdays.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="calendar-days">
                {Array.from({ length: cellCount }, (_, index) => {
                  const date = new Date(
                    month.getFullYear(),
                    month.getMonth(),
                    index - firstDay + 1,
                  );
                  const outside = date.getMonth() !== month.getMonth();
                  const past = date < today;
                  const active = dateKey(date) === dateKey(selectedDate);
                  const todaySelected = dateKey(date) === dateKey(today);
                  const hasSessions = scheduledDates.has(dateKey(date));
                  const selectable = !past;
                  return (
                    <button
                      key={dateKey(date)}
                      type="button"
                      disabled={!selectable}
                      className={`calendar-day ${outside ? "outside" : ""} ${past ? "past" : ""} ${active ? "selected" : ""} ${hasSessions ? "has-sessions" : ""}`}
                      aria-pressed={active}
                      aria-label={`${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${weekdays[date.getDay()]}요일${hasSessions ? ", 세션 일정 있음" : ""}${todaySelected ? ", 오늘" : ""}`}
                      onClick={() => {
                        if (outside) {
                          setMonth(
                            new Date(date.getFullYear(), date.getMonth(), 1),
                          );
                        }
                        onSelectDate(date);
                      }}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}
    </CalendarStyles>
  );
}

const CalendarStyles = styled.div`
  display: contents;

  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 1.6rem 0 0.8rem;
  }
  .heading-copy {
    min-width: 0;
  }
  .section-heading h1 {
    font-family: var(--display-font);
    font-size: 2.1rem;
    font-weight: 400;
    letter-spacing: -0.07rem;
  }
  .heading-copy p {
    margin-top: 0.5rem;
    color: var(--text-secondary);
    font-size: 1.3rem;
    line-height: 1.5;
  }
  .icon-button {
    border: 0;
    background: transparent;
    width: 4.4rem;
    height: 4.4rem;
    display: grid;
    place-items: center;
    padding: 1rem;
    border-radius: 50%;
  }
  .icon-button:hover {
    background: #2b302c08;
  }
  .icon-button svg {
    width: 2.4rem;
    height: 2.4rem;
  }
  .calendar-toggle.expanded {
    transform: rotate(90deg);
  }
  .calendar {
    background: var(--white);
    border-radius: 2.6rem;
    padding: 1rem 1.6rem 1.8rem;
    box-shadow: 0 0.6rem 2.2rem #2b302c0a;
  }
  .calendar-heading {
    display: grid;
    grid-template-columns: 4.4rem minmax(0, 1fr) 4.4rem;
    align-items: center;
    margin: 0 -0.8rem 0.7rem;
  }
  .calendar-heading h2 {
    font-size: 1.8rem;
    font-weight: 750;
    text-align: center;
  }
  .calendar-title {
    border: 0;
    background: transparent;
    min-height: 4.4rem;
    padding: 0.8rem;
    border-radius: 1.2rem;
    font: inherit;
  }
  .calendar-title:hover {
    background: var(--green-soft);
  }
  .calendar-heading .icon-button svg {
    width: 1.9rem;
    height: 1.9rem;
  }
  .month-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    padding: 0.7rem 0 0.2rem;
  }
  .month-option {
    min-height: 5.1rem;
    padding: 1.4rem 0.8rem;
    border: 0;
    border-radius: 1.4rem;
    background: transparent;
    font-size: 1.6rem;
    font-weight: 650;
  }
  .month-option:hover {
    background: transparent;
  }
  .month-option.current {
    background: var(--green);
  }
  .month-option.selected {
    box-shadow: inset 0 0 0 0.15rem var(--ink);
  }
  .weekdays,
  .calendar-days {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0.6rem;
  }
  .weekdays {
    margin-bottom: 1.2rem;
    text-align: center;
    color: #7c8590;
    font-size: 1.2rem;
    font-weight: 600;
  }
  .calendar-day {
    padding: 0;
    border: 0;
    border-radius: 1.3rem;
    aspect-ratio: 1;
    background: transparent;
    color: var(--ink);
    font-size: 1.4rem;
    font-weight: 650;
    transition:
      background 0.15s,
      box-shadow 0.15s;
  }
  .calendar-day:disabled:not(.has-sessions) {
    background: transparent;
  }
  .calendar-day.has-sessions {
    background: var(--green);
  }
  .calendar-day.outside {
    opacity: 1;
  }
  .calendar-day.past {
    color: var(--text-disabled);
  }
  .calendar-day:not(:disabled):hover:not(.has-sessions) {
    background: transparent;
  }
  .calendar-day.selected {
    box-shadow: inset 0 0 0 0.15rem var(--ink);
  }
  .calendar-day.selected:not(.past) {
    color: var(--ink);
  }

  @media (max-width: 37.4rem) {
    .calendar {
      padding-left: 1.2rem;
      padding-right: 1.2rem;
    }
  }
`;
