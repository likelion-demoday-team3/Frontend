import styled from "styled-components";

const businessDetails = [
  ["상호명", "키위 (Kiiwee)"],
  ["대표", "조민재"],
  ["사업자등록번호", "883-02-04007"],
  [
    "주소",
    "경기도 화성시 동탄구 동탄반석로 42 602-1902 (반송동, 동탄나루마을 한화꿈에그린 우림필유)",
  ],
  ["전화", "010-4897-2536"],
  ["이메일", "minjaec1030@gmail.com"],
  // 신고번호를 받으면 "정보 입력 필요" 자리에 넣는다
  ["통신판매업신고번호", "정보 입력 필요"],
];

export default function BusinessInfo() {
  return (
    <Footer>
      <h2>사업자 정보</h2>
      <dl>
        {businessDetails.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className={value === "정보 입력 필요" ? "pending" : undefined}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="copyright">
        © {new Date().getFullYear()} Kiiwee. All rights reserved.
      </p>
    </Footer>
  );
}

const Footer = styled.footer`
  margin: 0 3rem;
  padding: 2.4rem 0 calc(12rem + env(safe-area-inset-bottom));
  border-top: 0.1rem solid #e5e9e3;
  color: var(--text-secondary);

  h2 {
    margin: 0 0 1.4rem;
    color: var(--ink);
    font: 600 1.3rem/1.5 var(--font-body);
  }
  dl {
    display: grid;
    gap: 0.4rem;
    margin: 0;
  }
  dl > div {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 0.8rem;
    font-size: 1.1rem;
    line-height: 1.5;
  }
  dt {
    flex: 0 0 11rem;
  }
  dd {
    flex: 1 1 15rem;
    margin: 0;
    color: var(--ink);
  }
  dd.pending {
    color: #9aa29b;
  }
  .copyright {
    margin: 2rem 0 0;
    font-size: 1rem;
  }
`;
