import styled from "styled-components";

// 마이페이지 기간 선택 (1개월/3개월/6개월/1년/기타). 최종 매칭 결과 화면과 같은 모양이다
export type PeriodRange = "1" | "3" | "6" | "12" | "custom";

export const periodRanges: Array<{ value: PeriodRange; label: string }> = [
  { value: "1", label: "1개월" },
  { value: "3", label: "3개월" },
  { value: "6", label: "6개월" },
  { value: "12", label: "1년" },
  { value: "custom", label: "기타" },
];

/**
 * 선택한 기간을 서버에 보낼 ISO 시각으로 바꾼다.
 * N개월은 지금부터 N개월 전 이후 전부(앞으로 있을 세션 포함),
 * 기타는 시작일 00:00 ~ 종료일 23:59:59.999 (한국 시간). 비어 있는 쪽은 제한 없음.
 */
export function periodBounds(
  range: PeriodRange,
  startDate: string,
  endDate: string,
): { from?: string; to?: string } {
  if (range === "custom") {
    return {
      from: startDate
        ? new Date(`${startDate}T00:00:00+09:00`).toISOString()
        : undefined,
      to: endDate
        ? new Date(`${endDate}T23:59:59.999+09:00`).toISOString()
        : undefined,
    };
  }
  const from = new Date();
  from.setMonth(from.getMonth() - Number(range));
  return { from: from.toISOString() };
}

type PeriodFilterProps = {
  label: string;
  range: PeriodRange;
  startDate: string;
  endDate: string;
  onRangeChange: (range: PeriodRange) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
};

export default function PeriodFilter({
  label,
  range,
  startDate,
  endDate,
  onRangeChange,
  onStartDateChange,
  onEndDateChange,
}: PeriodFilterProps) {
  return (
    <>
      <RangeOptions aria-label={label}>
        {periodRanges.map((item) => (
          <button
            key={item.value}
            type="button"
            className={range === item.value ? "selected" : ""}
            aria-pressed={range === item.value}
            onClick={() => onRangeChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </RangeOptions>
      {range === "custom" && (
        <DateRange>
          <label>
            시작일
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => onStartDateChange(event.target.value)}
            />
          </label>
          <span aria-hidden="true">~</span>
          <label>
            종료일
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => onEndDateChange(event.target.value)}
            />
          </label>
        </DateRange>
      )}
    </>
  );
}

const RangeOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  button {
    min-height: 3.6rem;
    padding: 0 1.2rem;
    border: 0.1rem solid #dfe5dc;
    border-radius: 99px;
    background: #fff;
    color: #536057;
    font-size: 1.15rem;
  }
  button.selected {
    border-color: var(--green);
    background: var(--green);
    color: #273219;
    font-weight: 700;
  }
`;

const DateRange = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: end;
  gap: 0.8rem;
  margin-top: 1.5rem;
  label {
    display: grid;
    gap: 0.5rem;
    color: #536057;
    font-size: 1.1rem;
  }
  input {
    width: 100%;
    min-width: 0;
    min-height: 4.2rem;
    padding: 0 0.8rem;
    border: 0.1rem solid #dfe5dc;
    border-radius: 0.8rem;
    background: #fff;
    color: var(--ink);
    font: 400 1.15rem var(--font-body);
  }
  > span {
    padding-bottom: 1.2rem;
    color: #7d877a;
  }
`;
