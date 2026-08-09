import {
  defineGrade3PilotLedger,
  type Grade3PilotLedger,
  type PilotLedgerEntry,
  type PilotSourceManifest
} from "@mathcanvas/contracts";
import {
  findTeacherTextbookUnit,
  type TeacherTextbookUnit
} from "./teacher-catalog.js";

const NCIC_URL =
  "https://ncic.re.kr/inv/org/download.do?year=2022&seq=10003559&orgType=ogi4";
const NCIC_SHA256 =
  "ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840";
const PPT_SHA256 =
  "6e2e7fd499daf5f87461786e51382eb6bcaf25779f49559a6b08001a806a38f2";
const REVIEWED_AT = "2026-08-08T00:00:00.000Z";

const REVIEWER_ID = "claude-opus-5-r1-source-review";
const EXTRACTOR_ID = "codex-r1-implementation";

type SourceDraft = {
  sourceId: string;
  title: string;
  url: string;
  version: string;
  contentSha256: string;
  locator: string;
  authority: "standard" | "unit" | "auxiliary";
  verificationStatus:
    | "official-text-verified"
    | "official-source-checked"
    | "auxiliary-pinned"
    | "unverified";
  extractedBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
};

const source = <T extends SourceDraft>(
  input: T
): T & { reviewedBy: string; reviewedAt: string } =>
  ({
    ...input,
    reviewedBy: input.reviewedBy ?? REVIEWER_ID,
    reviewedAt: input.reviewedAt ?? REVIEWED_AT
  }) as T & { reviewedBy: string; reviewedAt: string };

const standardAuthority = source({
  sourceId: "kr-ncic-2022-elementary-math",
  title: "교육부 고시 제2022-33호 [별책 8] 수학과 교육과정",
  url: NCIC_URL,
  version: "교육부 고시 제2022-33호",
  contentSha256: NCIC_SHA256,
  locator:
    "PDF physical p.23–29 (printed folio 17–23) > 3–4학년군 성취기준",
  authority: "standard" as const,
  verificationStatus: "official-text-verified" as const,
  extractedBy: EXTRACTOR_ID
}) as PilotSourceManifest["standardAuthority"];

const unitAuthorities = {
  1: source({
    sourceId: "visang-grade-3-semester-1",
    title: "교과서 개념잡기 초등수학 3-1 (22개정)",
    url: "https://book.visang.com/books/info/5435",
    version: "2022 개정 · 2026년 학습",
    contentSha256:
      "397690b480149e0d302b28282263e79d7f5b912f75b52300a23289fb4b1c7817",
    locator: "HTML line 1418 > 목차 > 3학년 1학기",
    authority: "unit" as const,
    verificationStatus: "official-text-verified" as const,
    extractedBy: EXTRACTOR_ID
  }) as PilotSourceManifest["unitAuthorities"][number],
  2: source({
    sourceId: "visang-grade-3-semester-2",
    title: "교과서 개념잡기 초등 수학 3-2 (22개정)",
    url: "https://book.visang.com/books/info/5734",
    version: "2022 개정 · 2026년 학습",
    contentSha256:
      "e3edf0ae9263be8276e0ee38d82f80d91a9bfb0be779aadcda6f88b6c8cca014",
    locator: "HTML line 1418 > 목차 > 3학년 2학기",
    authority: "unit" as const,
    verificationStatus: "official-text-verified" as const,
    extractedBy: EXTRACTOR_ID
  }) as PilotSourceManifest["unitAuthorities"][number]
} as const;

const crossBandUnitAuthority = source({
  sourceId: "visang-grade-2-semester-1",
  title: "교과서 개념잡기 초등수학 2-1 (22개정)",
  url: "https://book.visang.com/books/info/5416",
  version: "2022 개정 · 2026년 학습",
  contentSha256:
    "55dc02f1d817520604cde8331a2fd3ce40ee69acdc9148198e7fc5f70b780937",
  locator: "HTML line 1418 > 목차 > 2학년 1학기",
  authority: "unit" as const,
  verificationStatus: "official-text-verified" as const,
  extractedBy: EXTRACTOR_ID
}) as PilotSourceManifest["crossBandUnitAuthorities"][number];

const sourceManifest = {
  schemaVersion: "1.0.0" as const,
  pilotId: "grade-3-basic-practice-30" as const,
  ppt: source({
    sourceId: "ppt-grade-3-basic-practice-30",
    title: "Claude 전달용 PPT 내용 원고 30개 합본",
    url: "file:///Users/yubyeongju/Downloads/claude-all-30-ppt-content.md",
    version: "30개 기본 연습 원고",
    contentSha256: PPT_SHA256,
    locator: "PPT 01–30 heading block",
    authority: "auxiliary" as const,
    verificationStatus: "auxiliary-pinned" as const,
    extractedBy: EXTRACTOR_ID
  }) as PilotSourceManifest["ppt"],
  standardAuthority,
  unitAuthorities: [unitAuthorities[1], unitAuthorities[2]],
  crossBandUnitAuthorities: [crossBandUnitAuthority],
  authorityEvidence: {
    file: "research/curriculum/grade-3-pilot-authority-evidence.json",
    sha256:
      "a242782652473b8d9323a297341e997ed096110f9ad815e7ab4bbde55b1045b6"
  },
  learningMap: {
    repository: "DECK6/korean-elementary-learning-map" as const,
    commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
    topicsSha256:
      "80aa059ed305ce4cbeb0df45436c0b204a42cd208204c1cc1e5332c70c4bf5f3",
    dependenciesSha256:
      "e09a6137bb70edf2a0b0928c05a4bd3f102c80845846ff13b10767ef4ceafe2c",
    standardsSha256:
      "aaaebb939c17fcc11a808fef3ae8164823425f74bfe8092a4a66941cb8c33335",
    fixtureSha256:
      "43ef984c785a1050603c8ab0fd6c3bb753392efbe12255771eef2cad4dae903c"
  },
  extractedBy: EXTRACTOR_ID,
  reviewedBy: REVIEWER_ID,
  reviewedAt: REVIEWED_AT
} satisfies PilotSourceManifest;

type StandardCode =
  | "[4수01-04]"
  | "[4수01-05]"
  | "[4수01-06]"
  | "[4수01-09]"
  | "[4수01-10]"
  | "[4수01-11]"
  | "[4수03-06]"
  | "[4수03-15]"
  | "[4수03-16]"
  | "[4수03-18]"
  | "[4수03-21]"
  | "[4수04-01]";

type Domain = PilotLedgerEntry["domain"];

const standardDefinitions: Record<
  StandardCode,
  { domain: Domain; officialGoal: string; locator: string }
> = {
  "[4수01-04]": {
    domain: "수와 연산",
    officialGoal:
      "곱하는 수가 한 자리 수 또는 두 자리 수인 곱셈의 계산 원리를 이해하고 그 계산을 할 수 있다.",
    locator: "PDF physical p.23 (printed folio 17) > [4수01-04]"
  },
  "[4수01-05]": {
    domain: "수와 연산",
    officialGoal:
      "나눗셈이 이루어지는 실생활 상황과 연결하여 나눗셈의 의미를 알고, 곱셈과 나눗셈의 관계를 이해한다.",
    locator: "PDF physical p.23 (printed folio 17) > [4수01-05]"
  },
  "[4수01-06]": {
    domain: "수와 연산",
    officialGoal:
      "나누는 수가 한 자리 수인 나눗셈의 계산 원리를 이해하고 그 계산을 할 수 있으며, 나눗셈에서 몫과 나머지의 의미를 안다.",
    locator: "PDF physical p.23 (printed folio 17) > [4수01-06]"
  },
  "[4수01-09]": {
    domain: "수와 연산",
    officialGoal:
      "양의 등분할을 통하여 분수의 필요성을 인식하고, 분수를 이해하고 읽고 쓸 수 있다.",
    locator: "PDF physical p.23 (printed folio 17) > [4수01-09]"
  },
  "[4수01-10]": {
    domain: "수와 연산",
    officialGoal:
      "단위분수, 진분수, 가분수, 대분수를 알고, 그 관계를 이해한다.",
    locator: "PDF physical p.23 (printed folio 17) > [4수01-10]"
  },
  "[4수01-11]": {
    domain: "수와 연산",
    officialGoal:
      "분모가 같은 분수끼리, 단위분수끼리 크기를 비교하고 그 방법을 설명할 수 있다.",
    locator: "PDF physical p.23 (printed folio 17) > [4수01-11]"
  },
  "[4수03-06]": {
    domain: "도형과 측정",
    officialGoal: "원의 중심, 반지름, 지름을 이해하고, 그 성질을 안다.",
    locator: "PDF physical p.26 (printed folio 20) > [4수03-06]"
  },
  "[4수03-15]": {
    domain: "도형과 측정",
    officialGoal:
      "길이 단위 1mm와 1km를 알고, 이를 이용하여 길이를 측정하고 어림하며 수학의 유용성을 인식할 수 있다.",
    locator: "PDF physical p.27 (printed folio 21) > [4수03-15]"
  },
  "[4수03-16]": {
    domain: "도형과 측정",
    officialGoal:
      "1cm와 1mm, 1km와 1m의 관계를 이해하고, 길이를 ‘몇 cm 몇 mm’와 ‘몇 mm’, ‘몇 km 몇 m’와 ‘몇 m’로 다양하게 표현할 수 있다.",
    locator: "PDF physical p.27 (printed folio 21) > [4수03-16]"
  },
  "[4수03-18]": {
    domain: "도형과 측정",
    officialGoal:
      "1L와 1mL의 관계를 이해하고, 들이를 ‘몇 L 몇 mL’와 ‘몇 mL’로 표현할 수 있다.",
    locator: "PDF physical p.27 (printed folio 21) > [4수03-18]"
  },
  "[4수03-21]": {
    domain: "도형과 측정",
    officialGoal:
      "1kg과 1g의 관계를 이해하고, 무게를 ‘몇 kg 몇 g’과 ‘몇 g’으로 표현할 수 있다.",
    locator: "PDF physical p.27 (printed folio 21) > [4수03-21]"
  },
  "[4수04-01]": {
    domain: "자료와 가능성",
    officialGoal:
      "자료를 수집하여 그림그래프나 막대그래프로 나타내고 해석할 수 있다.",
    locator: "PDF physical p.29 (printed folio 23) > [4수04-01]"
  }
};

const learningMapDefinitions = {
  "[4수01-04]": {
    topicId: "kr.mt.math.number-operations.g3-4.s4-01-04.representation",
    prerequisiteTopicIds: [
      "kr.mt.math.number-operations.g3-4.s4-01-04.concept"
    ],
    observableEvidence:
      "[4수01-04] 세 자리 수 범위의 곱셈 - 표현과 연결을 말·글·표·그림·소리·움직임 중 알맞은 방식으로 표현한다.",
    assessmentPrompt:
      "‘세 자리 수 범위의 곱셈’에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라."
  },
  "[4수01-05]": {
    topicId: "kr.mt.math.number-operations.g3-4.s4-01-05.representation",
    prerequisiteTopicIds: [
      "kr.mt.math.number-operations.g3-4.s4-01-05.concept"
    ],
    observableEvidence:
      "[4수01-05] 세 자리 수 범위의 나눗셈 - 표현과 연결을 말·글·표·그림·소리·움직임 중 알맞은 방식으로 표현한다.",
    assessmentPrompt:
      "‘세 자리 수 범위의 나눗셈’에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라."
  },
  "[4수01-06]": {
    topicId: "kr.mt.math.number-operations.g3-4.s4-01-06.representation",
    prerequisiteTopicIds: [
      "kr.mt.math.number-operations.g3-4.s4-01-06.concept"
    ],
    observableEvidence:
      "[4수01-06] 세 자리 수 범위의 나눗셈 - 표현과 연결을 말·글·표·그림·소리·움직임 중 알맞은 방식으로 표현한다.",
    assessmentPrompt:
      "‘세 자리 수 범위의 나눗셈’에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라."
  },
  "[4수01-09]": {
    topicId: "kr.mt.math.number-operations.g3-4.s4-01-09.representation",
    prerequisiteTopicIds: [
      "kr.mt.math.number-operations.g3-4.s4-01-09.concept"
    ],
    observableEvidence:
      "[4수01-09] 분수 - 표현과 연결을 말·글·표·그림·소리·움직임 중 알맞은 방식으로 표현한다.",
    assessmentPrompt:
      "‘분수’에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라."
  },
  "[4수01-10]": {
    topicId: "kr.mt.math.number-operations.g3-4.s4-01-10.representation",
    prerequisiteTopicIds: [
      "kr.mt.math.number-operations.g3-4.s4-01-10.concept"
    ],
    observableEvidence:
      "[4수01-10] 분수 - 표현과 연결을 말·글·표·그림·소리·움직임 중 알맞은 방식으로 표현한다.",
    assessmentPrompt:
      "‘분수’에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라."
  },
  "[4수01-11]": {
    topicId: "kr.mt.math.number-operations.g3-4.s4-01-11.representation",
    prerequisiteTopicIds: [
      "kr.mt.math.number-operations.g3-4.s4-01-11.concept"
    ],
    observableEvidence:
      "[4수01-11] 분수 - 표현과 연결을 말·글·표·그림·소리·움직임 중 알맞은 방식으로 표현한다.",
    assessmentPrompt:
      "‘분수’에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라."
  },
  "[4수03-06]": {
    topicId:
      "kr.mt.math.geometry-measurement.g3-4.s4-03-06.representation",
    prerequisiteTopicIds: [
      "kr.mt.math.geometry-measurement.g3-4.s4-03-06.concept"
    ],
    observableEvidence:
      "[4수03-06] 원의 구성 요소 - 표현과 연결을 말·글·표·그림·소리·움직임 중 알맞은 방식으로 표현한다.",
    assessmentPrompt:
      "‘원의 구성 요소’에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라."
  },
  "[4수03-15]": {
    topicId:
      "kr.mt.math.geometry-measurement.g3-4.s4-03-15.representation",
    prerequisiteTopicIds: [
      "kr.mt.math.geometry-measurement.g3-4.s4-03-15.concept"
    ],
    observableEvidence:
      "[4수03-15] 길이 - 표현과 연결을 말·글·표·그림·소리·움직임 중 알맞은 방식으로 표현한다.",
    assessmentPrompt:
      "‘길이’에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라."
  },
  "[4수03-16]": {
    topicId:
      "kr.mt.math.geometry-measurement.g3-4.s4-03-16.representation",
    prerequisiteTopicIds: [
      "kr.mt.math.geometry-measurement.g3-4.s4-03-16.concept"
    ],
    observableEvidence:
      "[4수03-16] 길이 - 표현과 연결을 말·글·표·그림·소리·움직임 중 알맞은 방식으로 표현한다.",
    assessmentPrompt:
      "‘길이’에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라."
  },
  "[4수03-18]": {
    topicId:
      "kr.mt.math.geometry-measurement.g3-4.s4-03-18.representation",
    prerequisiteTopicIds: [
      "kr.mt.math.geometry-measurement.g3-4.s4-03-18.concept"
    ],
    observableEvidence:
      "[4수03-18] 들이 - 표현과 연결을 말·글·표·그림·소리·움직임 중 알맞은 방식으로 표현한다.",
    assessmentPrompt:
      "‘들이’에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라."
  },
  "[4수03-21]": {
    topicId:
      "kr.mt.math.geometry-measurement.g3-4.s4-03-21.representation",
    prerequisiteTopicIds: [
      "kr.mt.math.geometry-measurement.g3-4.s4-03-21.concept"
    ],
    observableEvidence:
      "[4수03-21] 무게 - 표현과 연결을 말·글·표·그림·소리·움직임 중 알맞은 방식으로 표현한다.",
    assessmentPrompt:
      "‘무게’에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라."
  },
  "[4수04-01]": {
    topicId: "kr.mt.math.data-probability.g3-4.s4-04-01.representation",
    prerequisiteTopicIds: [
      "kr.mt.math.data-probability.g3-4.s4-04-01.concept"
    ],
    observableEvidence:
      "[4수04-01] 자료의 수집과 정리 - 표현과 연결을 말·글·표·그림·소리·움직임 중 알맞은 방식으로 표현한다.",
    assessmentPrompt:
      "‘자료의 수집과 정리’에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라."
  }
} satisfies Record<
  StandardCode,
  {
    topicId: string;
    prerequisiteTopicIds: readonly string[];
    observableEvidence: string;
    assessmentPrompt: string;
  }
>;

type NativeAffordance = PilotLedgerEntry["nativeAffordance"];

const nativeAffordances: Record<string, NativeAffordance> = {
  "native-array-model-v1": {
    affordanceFamilyId: "native-array-model-v1",
    version: "1.0.0",
    candidateToolKeys: ["NO04NG"],
    requiredOperation: "배열의 행·열 구조를 바꾸거나 선택해 전체 수를 확인한다.",
    semanticState: "행 수, 열 수, 전체 개수와 배열 구조가 저장된다.",
    supportState: "captured",
    evidenceIds: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=NO04NG",
      "research/mathcanvas/division-native-semantic-probe.json#candidate=NO04NG"
    ],
    evidenceRefs: [
      {
        id: "research/mathcanvas/tool-catalog.snapshot.json#tool=NO04NG",
        file: "research/mathcanvas/tool-catalog.snapshot.json",
        sha256:
          "549a6862f9aeebeae6b0665379e95bf3befdcdf9b03b5d9f0681bb80b6f833e7",
        toolKey: "NO04NG",
        claim: "captured"
      },
      {
        id: "research/mathcanvas/division-native-semantic-probe.json#candidate=NO04NG",
        file: "research/mathcanvas/division-native-semantic-probe.json",
        sha256:
          "3bdeedc9c2f281c9fd9db1ed3cfa855f34ddae3b59cc0c7522f85df2f867d45b",
        toolKey: "NO04NG",
        claim: "captured"
      }
    ]
  },
  "native-counting-model-v1": {
    affordanceFamilyId: "native-counting-model-v1",
    version: "1.0.0",
    candidateToolKeys: ["NO01SC"],
    requiredOperation: "낱개를 같은 수씩 묶고 묶음과 남은 낱개의 수를 확인한다.",
    semanticState: "group-element, groupId, member count와 ungrouped residual count가 저장된다.",
    supportState: "released",
    evidenceIds: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=NO01SC",
      "research/mathcanvas/division-counting-group-canary.json#claim=released:NO01SC"
    ],
    evidenceRefs: [
      {
        id: "research/mathcanvas/tool-catalog.snapshot.json#tool=NO01SC",
        file: "research/mathcanvas/tool-catalog.snapshot.json",
        sha256:
          "549a6862f9aeebeae6b0665379e95bf3befdcdf9b03b5d9f0681bb80b6f833e7",
        toolKey: "NO01SC",
        claim: "captured"
      },
      {
        id: "research/mathcanvas/division-counting-group-canary.json#claim=released:NO01SC",
        file: "research/mathcanvas/division-counting-group-canary.json",
        sha256:
          "045f8147302dd1b4625bc4a3e33ece1b9b0e2caf8b638d2b0690c7eda1e942d5",
        toolKey: "NO01SC",
        claim: "released"
      }
    ]
  },
  "native-fraction-model-v1": {
    affordanceFamilyId: "native-fraction-model-v1",
    version: "1.0.0",
    candidateToolKeys: ["NO03FM"],
    requiredOperation: "같은 전체를 일정한 조각으로 나누고 색칠한 조각 수를 비교한다.",
    semanticState: "전체 수, 분할 수, 선택된 조각 membership가 저장된다.",
    supportState: "released",
    evidenceIds: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=NO03FM",
      "research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=released:NO03FM"
    ],
    evidenceRefs: [
      {
        id: "research/mathcanvas/tool-catalog.snapshot.json#tool=NO03FM",
        file: "research/mathcanvas/tool-catalog.snapshot.json",
        sha256:
          "549a6862f9aeebeae6b0665379e95bf3befdcdf9b03b5d9f0681bb80b6f833e7",
        toolKey: "NO03FM",
        claim: "captured"
      },
      {
        id: "research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=released:NO03FM",
        file: "research/mathcanvas/wave1-current-golden-canary.roundtrip.json",
        sha256:
          "33289aaa6007dbd72fb09e984f5a422e238851f035f258d2f58219c7ac634f7d",
        toolKey: "NO03FM",
        claim: "released"
      }
    ]
  },
  "native-place-value-model-v1": {
    affordanceFamilyId: "native-place-value-model-v1",
    version: "1.0.0",
    candidateToolKeys: ["NO04PD"],
    requiredOperation: "자릿값 모형의 묶음을 교환하거나 자리별 개수를 비교한다.",
    semanticState: "자리별 모형 수와 교환 후 묶음 membership가 저장된다.",
    supportState: "released",
    evidenceIds: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=NO04PD",
      "research/mathcanvas/wave14-place-value-release-canary.json#tool=NO04PD"
    ],
    evidenceRefs: [
      {
        id: "research/mathcanvas/tool-catalog.snapshot.json#tool=NO04PD",
        file: "research/mathcanvas/tool-catalog.snapshot.json",
        sha256:
          "549a6862f9aeebeae6b0665379e95bf3befdcdf9b03b5d9f0681bb80b6f833e7",
        toolKey: "NO04PD",
        claim: "captured"
      },
      {
        id: "research/mathcanvas/wave14-place-value-release-canary.json#tool=NO04PD",
        file: "research/mathcanvas/wave14-place-value-release-canary.json",
        sha256:
          "fa1f1fb11863d061737eb5c9d2cbbfe3333d9b3b8c2f2c292dadb853c9629840",
        toolKey: "NO04PD",
        claim: "released"
      }
    ]
  },
  "native-circle-model-v1": {
    affordanceFamilyId: "native-circle-model-v1",
    version: "1.0.0",
    candidateToolKeys: ["SM07CS"],
    requiredOperation: "원의 중심에서 원 위 점까지 선을 조작해 반지름·지름을 확인한다.",
    semanticState: "중심, 원 위 점, 반지름·지름 관계가 저장된다.",
    supportState: "captured",
    evidenceIds: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=SM07CS"
    ],
    evidenceRefs: [
      {
        id: "research/mathcanvas/tool-catalog.snapshot.json#tool=SM07CS",
        file: "research/mathcanvas/tool-catalog.snapshot.json",
        sha256:
          "549a6862f9aeebeae6b0665379e95bf3befdcdf9b03b5d9f0681bb80b6f833e7",
        toolKey: "SM07CS",
        claim: "captured"
      }
    ]
  },
  "native-picture-graph-v1": {
    affordanceFamilyId: "native-picture-graph-v1",
    version: "1.0.0",
    candidateToolKeys: ["DP03PG"],
    requiredOperation: "범례와 그림의 개수를 연결해 실제 수량을 읽고 비교한다.",
    semanticState: "범례 단위, 행별 그림 수, 해석된 수량이 저장된다.",
    supportState: "captured",
    evidenceIds: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=DP03PG",
      "research/mathcanvas/graph-tool-contract.observations.json#tool=DP03PG"
    ],
    evidenceRefs: [
      {
        id: "research/mathcanvas/tool-catalog.snapshot.json#tool=DP03PG",
        file: "research/mathcanvas/tool-catalog.snapshot.json",
        sha256:
          "549a6862f9aeebeae6b0665379e95bf3befdcdf9b03b5d9f0681bb80b6f833e7",
        toolKey: "DP03PG",
        claim: "captured"
      },
      {
        id: "research/mathcanvas/graph-tool-contract.observations.json#tool=DP03PG",
        file: "research/mathcanvas/graph-tool-contract.observations.json",
        sha256:
          "48b31f3b08d8cd0768709e7bf484dc92331c801fb92732128d2e2146c29e61bc",
        toolKey: "DP03PG",
        claim: "captured"
      }
    ]
  },
  "native-unit-conversion-v1": {
    affordanceFamilyId: "native-unit-conversion-v1",
    version: "1.0.0",
    candidateToolKeys: ["NO04NT", "NO01SC"],
    requiredOperation: "큰 단위와 작은 단위의 묶음을 교환해 같은 양을 두 방식으로 나타낸다.",
    semanticState: "단위별 묶음 수, 교환 membership와 동등한 총량이 저장된다.",
    supportState: "captured",
    evidenceIds: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=NO04NT",
      "research/mathcanvas/module-variant-contract.static.json#tool=NO04NT"
    ],
    evidenceRefs: [
      {
        id: "research/mathcanvas/tool-catalog.snapshot.json#tool=NO04NT",
        file: "research/mathcanvas/tool-catalog.snapshot.json",
        sha256:
          "549a6862f9aeebeae6b0665379e95bf3befdcdf9b03b5d9f0681bb80b6f833e7",
        toolKey: "NO04NT",
        claim: "captured"
      },
      {
        id: "research/mathcanvas/module-variant-contract.static.json#tool=NO04NT",
        file: "research/mathcanvas/module-variant-contract.static.json",
        sha256:
          "074d0af84a040d6769569c0346e7480749ac2c6b164df3f65fdc1cdfbe5fdde4",
        toolKey: "NO04NT",
        claim: "captured"
      }
    ]
  }
};

const family = (id: string, rationale: string) => ({
  id,
  version: "1.0.0",
  rationale
});

const blueprintFamilies = {
  picture: family(
    "picture-graph-interpretation-v1",
    "범례 단위와 그림 수를 곱해 실제 수량의 차이를 해석하는 판단을 공유한다."
  ),
  array: family(
    "discrete-array-meaning-v1",
    "행·열 또는 같은 묶음 구조를 곱셈식과 연결하는 판단을 공유한다."
  ),
  placeValue: family(
    "place-value-distributive-product-v1",
    "두 자리 수를 자릿값에 따라 나누어 부분곱을 구성하는 판단을 공유한다."
  ),
  division: family(
    "equal-group-division-v1",
    "전체를 같은 수씩 묶어 몫과 남은 수의 의미를 확인하는 판단을 공유한다."
  ),
  divisionRelation: family(
    "division-remainder-meaning-v1",
    "곱셈과 나눗셈의 관계로 몫·나머지와 처음 수를 되짚는 판단을 공유한다."
  ),
  fractionPart: family(
    "fraction-part-whole-v1",
    "같은 전체를 똑같이 나눈 조각과 부분의 수를 분수로 연결하는 판단을 공유한다."
  ),
  fractionType: family(
    "fraction-type-conversion-v1",
    "가분수와 대분수가 같은 양을 나타내는지 전체 단위로 확인하는 판단을 공유한다."
  ),
  fractionCompare: family(
    "fraction-same-denominator-comparison-v1",
    "같은 단위분수 조각의 개수를 비교해 분수의 크기를 설명하는 판단을 공유한다."
  ),
  lengthUnit: family(
    "length-unit-selection-v1",
    "대상의 크기에 맞는 길이 단위를 고르고 단위의 의미를 설명하는 판단을 공유한다."
  ),
  lengthConversion: family(
    "length-unit-conversion-v1",
    "cm·mm 또는 km·m 묶음을 교환해 같은 길이를 다른 방식으로 나타내는 판단을 공유한다."
  ),
  circle: family(
    "circle-components-v1",
    "원의 중심·반지름·지름 관계를 native 원 모형으로 확인하는 판단을 공유한다."
  ),
  capacity: family(
    "capacity-unit-conversion-v1",
    "L와 mL의 단위 관계를 묶음 교환으로 확인하는 판단을 공유한다."
  ),
  mass: family(
    "mass-unit-conversion-v1",
    "kg과 g의 단위 관계를 묶음 교환으로 확인하는 판단을 공유한다."
  )
} as const;

const layoutFamilies = {
  choice: family(
    "one-screen-choice-workbench-v1",
    "예상 선택, native 확인, 설명, 수정의 네 구역을 한 화면 세로 흐름으로 배치한다."
  ),
  array: family(
    "one-screen-array-workbench-v1",
    "배열·묶음 native 모형과 예상·설명 영역을 한 화면에 함께 배치한다."
  ),
  fraction: family(
    "one-screen-fraction-workbench-v1",
    "분수 native 모형의 전체·조각 reserve를 먼저 확보하고 설명 영역을 배치한다."
  ),
  division: family(
    "one-screen-division-workbench-v1",
    "묶음·잔여 native 조작과 식 설명 rail을 한 화면에 고정한다."
  ),
  measurement: family(
    "one-screen-measurement-rail-v1",
    "단위 선택·변환과 측정 근거를 가로 rail과 세로 설명 흐름으로 배치한다."
  ),
  circle: family(
    "one-screen-circle-workbench-v1",
    "원 native 요소의 중심·반지름·지름 reserve를 중심으로 설명과 수정 영역을 배치한다."
  ),
  data: family(
    "one-screen-data-workbench-v1",
    "범례·그림그래프 native 영역과 수량 해석·설명 영역을 한 화면에 배치한다."
  ),
  unit: family(
    "one-screen-unit-conversion-v1",
    "큰 단위와 작은 단위의 native 묶음, 등가 식, 설명 영역을 한 화면에 배치한다."
  )
} as const;

const variationPreset = (id: string, decision: string) =>
  family(id, `30개 기본 연습의 한 화면 변형: ${decision}`);

const pptLocators: Record<number, string> = {
  1: "claude-all-30-ppt-content.md#L3-L124",
  2: "claude-all-30-ppt-content.md#L126-L249",
  3: "claude-all-30-ppt-content.md#L251-L374",
  4: "claude-all-30-ppt-content.md#L376-L495",
  5: "claude-all-30-ppt-content.md#L497-L616",
  6: "claude-all-30-ppt-content.md#L618-L741",
  7: "claude-all-30-ppt-content.md#L743-L866",
  8: "claude-all-30-ppt-content.md#L868-L988",
  9: "claude-all-30-ppt-content.md#L990-L1110",
  10: "claude-all-30-ppt-content.md#L1112-L1237",
  11: "claude-all-30-ppt-content.md#L1239-L1363",
  12: "claude-all-30-ppt-content.md#L1365-L1486",
  13: "claude-all-30-ppt-content.md#L1488-L1610",
  14: "claude-all-30-ppt-content.md#L1612-L1735",
  15: "claude-all-30-ppt-content.md#L1737-L1860",
  16: "claude-all-30-ppt-content.md#L1862-L1982",
  17: "claude-all-30-ppt-content.md#L1984-L2103",
  18: "claude-all-30-ppt-content.md#L2105-L2224",
  19: "claude-all-30-ppt-content.md#L2226-L2344",
  20: "claude-all-30-ppt-content.md#L2346-L2469",
  21: "claude-all-30-ppt-content.md#L2471-L2593",
  22: "claude-all-30-ppt-content.md#L2595-L2714",
  23: "claude-all-30-ppt-content.md#L2716-L2838",
  24: "claude-all-30-ppt-content.md#L2840-L2964",
  25: "claude-all-30-ppt-content.md#L2966-L3087",
  26: "claude-all-30-ppt-content.md#L3089-L3206",
  27: "claude-all-30-ppt-content.md#L3208-L3326",
  28: "claude-all-30-ppt-content.md#L3328-L3448",
  29: "claude-all-30-ppt-content.md#L3450-L3570",
  30: "claude-all-30-ppt-content.md#L3572-L3701"
};

const titles = [
  "그림 하나에 숨은 수",
  "같은 묶음은 곱셈으로",
  "줄과 칸으로 전체 수 찾기",
  "34×2를 두 부분으로",
  "상자 수를 자릿값으로 곱하기",
  "18개를 똑같이 나누면",
  "곱셈의 빈칸으로 몫 찾기",
  "한 곱셈식에서 두 나눗셈식",
  "몇 묶음인지 곱셈으로 확인하기",
  "분수의 첫 조건, 똑같이",
  "같지 않은 조각을 고쳐 나누기",
  "전체와 부분을 분수로 읽기",
  "피자에서 분모와 분자 찾기",
  "연필에는 cm, 문에는 m",
  "크기에 맞는 길이 단위",
  "m·cm, km·m 연결하기",
  "자릿값을 살려 먼저 곱하기",
  "부분곱을 빠짐없이 더하기",
  "두 자리 수를 나누어 곱하기",
  "나눗셈이 묻는 두 가지",
  "먼저 나누고 남은 수 찾기",
  "몫과 나머지로 처음 수 확인하기",
  "원의 중심과 반지름 찾기",
  "반지름 두 개가 만드는 지름",
  "색칠한 부분을 분수로",
  "가분수를 대분수로 바꾸기",
  "분모가 같은 분수 비교하기",
  "L를 mL로 정확히 바꾸기",
  "kg을 g으로 정확히 바꾸기",
  "그림그래프의 실제 차이 구하기"
] as const;

const pptUnitByNumber: Record<
  number,
  { semester: 1 | 2; unitNumber: number; title: string }
> = {
  1: { semester: 2, unitNumber: 6, title: "그림그래프" },
  2: { semester: 1, unitNumber: 1, title: "곱셈" },
  3: { semester: 1, unitNumber: 1, title: "곱셈" },
  4: { semester: 1, unitNumber: 1, title: "곱셈" },
  5: { semester: 1, unitNumber: 1, title: "곱셈" },
  6: { semester: 1, unitNumber: 2, title: "나눗셈" },
  7: { semester: 1, unitNumber: 2, title: "나눗셈" },
  8: { semester: 1, unitNumber: 2, title: "나눗셈" },
  9: { semester: 1, unitNumber: 2, title: "나눗셈" },
  10: { semester: 1, unitNumber: 3, title: "분수" },
  11: { semester: 1, unitNumber: 3, title: "분수" },
  12: { semester: 1, unitNumber: 3, title: "분수" },
  13: { semester: 1, unitNumber: 3, title: "분수" },
  14: { semester: 1, unitNumber: 4, title: "길이" },
  15: { semester: 1, unitNumber: 4, title: "길이" },
  16: { semester: 1, unitNumber: 4, title: "길이" },
  17: { semester: 2, unitNumber: 1, title: "곱셈" },
  18: { semester: 2, unitNumber: 1, title: "곱셈" },
  19: { semester: 2, unitNumber: 1, title: "곱셈" },
  20: { semester: 2, unitNumber: 2, title: "나눗셈" },
  21: { semester: 2, unitNumber: 2, title: "나눗셈" },
  22: { semester: 2, unitNumber: 2, title: "나눗셈" },
  23: { semester: 2, unitNumber: 3, title: "원" },
  24: { semester: 2, unitNumber: 3, title: "원" },
  25: { semester: 2, unitNumber: 4, title: "분수" },
  26: { semester: 2, unitNumber: 4, title: "분수" },
  27: { semester: 2, unitNumber: 4, title: "분수" },
  28: { semester: 2, unitNumber: 5, title: "들이와 무게" },
  29: { semester: 2, unitNumber: 5, title: "들이와 무게" },
  30: { semester: 2, unitNumber: 6, title: "그림그래프" }
};

type CrossBandCode = "[2수01-10]" | "[2수03-10]";

const unitById: Record<string, TeacherTextbookUnit> = {
  "3-1-3": findTeacherTextbookUnit("3-1-3")!,
  "3-1-4": findTeacherTextbookUnit("3-1-4")!,
  "3-1-5": findTeacherTextbookUnit("3-1-5")!,
  "3-1-6": findTeacherTextbookUnit("3-1-6")!,
  "3-2-1": findTeacherTextbookUnit("3-2-1")!,
  "3-2-2": findTeacherTextbookUnit("3-2-2")!,
  "3-2-3": findTeacherTextbookUnit("3-2-3")!,
  "3-2-4": findTeacherTextbookUnit("3-2-4")!,
  "3-2-5": findTeacherTextbookUnit("3-2-5")!,
  "3-2-6": findTeacherTextbookUnit("3-2-6")!
};

const crossBandUnitByCode = {
  "[2수01-10]": {
    unitId: "2-1-6",
    grade: 2 as const,
    semester: 1 as const,
    unitNumber: 6,
    title: "곱셈",
    source: {
      ...crossBandUnitAuthority,
      locator: "HTML line 1418 > 목차 > 6. 곱셈"
    }
  },
  "[2수03-10]": {
    unitId: "2-1-4",
    grade: 2 as const,
    semester: 1 as const,
    unitNumber: 4,
    title: "길이 재기",
    source: {
      ...crossBandUnitAuthority,
      locator: "HTML line 1418 > 목차 > 4. 길이 재기"
    }
  }
} as const;

for (const [unitId, unit] of Object.entries(unitById)) {
  if (!unit || unit.id !== unitId) {
    throw new Error(`3학년 pilot 단원을 찾을 수 없습니다: ${unitId}`);
  }
}

const standardCodes: readonly StandardCode[] = [
  "[4수01-04]",
  "[4수01-05]",
  "[4수01-06]",
  "[4수01-09]",
  "[4수01-10]",
  "[4수01-11]",
  "[4수03-06]",
  "[4수03-15]",
  "[4수03-16]",
  "[4수03-18]",
  "[4수03-21]",
  "[4수04-01]"
];

const familyByEntry: Record<
  number,
  {
    blueprint: keyof typeof blueprintFamilies;
    affordance: keyof typeof nativeAffordances;
    layout: keyof typeof layoutFamilies;
    standard: StandardCode;
    unitId: keyof typeof unitById;
    crossBand?: CrossBandCode;
    variation?: string;
  }
> = {
  1: { blueprint: "picture", affordance: "native-picture-graph-v1", layout: "data", standard: "[4수04-01]", unitId: "3-2-6", variation: "picture-graph-count-basic-v1" },
  2: { blueprint: "array", affordance: "native-array-model-v1", layout: "array", standard: "[4수01-04]", unitId: "3-1-4", crossBand: "[2수01-10]", variation: "array-group-basic-v1" },
  3: { blueprint: "array", affordance: "native-array-model-v1", layout: "array", standard: "[4수01-04]", unitId: "3-1-4", crossBand: "[2수01-10]", variation: "array-row-column-basic-v1" },
  4: { blueprint: "placeValue", affordance: "native-place-value-model-v1", layout: "choice", standard: "[4수01-04]", unitId: "3-1-4" },
  5: { blueprint: "placeValue", affordance: "native-place-value-model-v1", layout: "choice", standard: "[4수01-04]", unitId: "3-1-4" },
  6: { blueprint: "division", affordance: "native-counting-model-v1", layout: "division", standard: "[4수01-05]", unitId: "3-1-3", crossBand: "[2수01-10]" },
  7: { blueprint: "division", affordance: "native-counting-model-v1", layout: "division", standard: "[4수01-05]", unitId: "3-1-3", crossBand: "[2수01-10]" },
  8: { blueprint: "division", affordance: "native-counting-model-v1", layout: "division", standard: "[4수01-05]", unitId: "3-1-3", crossBand: "[2수01-10]" },
  9: { blueprint: "division", affordance: "native-counting-model-v1", layout: "division", standard: "[4수01-05]", unitId: "3-1-3", crossBand: "[2수01-10]" },
  10: { blueprint: "fractionPart", affordance: "native-fraction-model-v1", layout: "fraction", standard: "[4수01-09]", unitId: "3-1-6" },
  11: { blueprint: "fractionPart", affordance: "native-fraction-model-v1", layout: "fraction", standard: "[4수01-09]", unitId: "3-1-6" },
  12: { blueprint: "fractionPart", affordance: "native-fraction-model-v1", layout: "fraction", standard: "[4수01-09]", unitId: "3-1-6" },
  13: { blueprint: "fractionPart", affordance: "native-fraction-model-v1", layout: "fraction", standard: "[4수01-09]", unitId: "3-1-6" },
  14: { blueprint: "lengthUnit", affordance: "native-unit-conversion-v1", layout: "measurement", standard: "[4수03-15]", unitId: "3-1-5", crossBand: "[2수03-10]" },
  15: { blueprint: "lengthUnit", affordance: "native-unit-conversion-v1", layout: "measurement", standard: "[4수03-15]", unitId: "3-1-5", crossBand: "[2수03-10]" },
  16: { blueprint: "lengthConversion", affordance: "native-unit-conversion-v1", layout: "measurement", standard: "[4수03-16]", unitId: "3-1-5" },
  17: { blueprint: "placeValue", affordance: "native-place-value-model-v1", layout: "choice", standard: "[4수01-04]", unitId: "3-2-1" },
  18: { blueprint: "placeValue", affordance: "native-place-value-model-v1", layout: "choice", standard: "[4수01-04]", unitId: "3-2-1" },
  19: { blueprint: "placeValue", affordance: "native-place-value-model-v1", layout: "choice", standard: "[4수01-04]", unitId: "3-2-1" },
  20: { blueprint: "divisionRelation", affordance: "native-counting-model-v1", layout: "division", standard: "[4수01-05]", unitId: "3-2-2", crossBand: "[2수01-10]" },
  21: { blueprint: "divisionRelation", affordance: "native-counting-model-v1", layout: "division", standard: "[4수01-06]", unitId: "3-2-2", variation: "division-remainder-build-basic-v1" },
  22: { blueprint: "divisionRelation", affordance: "native-counting-model-v1", layout: "division", standard: "[4수01-06]", unitId: "3-2-2", variation: "division-remainder-reconstruct-basic-v1" },
  23: { blueprint: "circle", affordance: "native-circle-model-v1", layout: "circle", standard: "[4수03-06]", unitId: "3-2-3" },
  24: { blueprint: "circle", affordance: "native-circle-model-v1", layout: "circle", standard: "[4수03-06]", unitId: "3-2-3" },
  25: { blueprint: "fractionPart", affordance: "native-fraction-model-v1", layout: "fraction", standard: "[4수01-09]", unitId: "3-2-4" },
  26: { blueprint: "fractionType", affordance: "native-fraction-model-v1", layout: "fraction", standard: "[4수01-10]", unitId: "3-2-4" },
  27: { blueprint: "fractionCompare", affordance: "native-fraction-model-v1", layout: "fraction", standard: "[4수01-11]", unitId: "3-2-4" },
  28: { blueprint: "capacity", affordance: "native-unit-conversion-v1", layout: "unit", standard: "[4수03-18]", unitId: "3-2-5" },
  29: { blueprint: "mass", affordance: "native-unit-conversion-v1", layout: "unit", standard: "[4수03-21]", unitId: "3-2-5" },
  30: { blueprint: "picture", affordance: "native-picture-graph-v1", layout: "data", standard: "[4수04-01]", unitId: "3-2-6", variation: "picture-graph-difference-basic-v1" }
};

const entryDetails: Record<
  number,
  Pick<PilotLedgerEntry, "mathematicalDecision" | "misconception" | "invariant" | "explanationFocus">
> = {
  1: { mathematicalDecision: "그림 수와 범례 중 무엇을 먼저 적용해 실제 수량을 비교할지 결정한다.", misconception: "그림 개수를 곧 실제 개수라고 읽는다.", invariant: "범례의 한 그림 단위와 행별 그림 수의 곱이 실제 수량이다.", explanationFocus: "그림 수에 범례를 곱한 까닭과 두 수량의 차이를 설명한다." },
  2: { mathematicalDecision: "같은 수씩 묶인 배열을 어떤 곱셈식으로 나타낼지 결정한다.", misconception: "묶음 수와 한 묶음의 수를 바꾸어 곱셈식에 쓴다.", invariant: "행 수 × 한 행의 수가 배열의 전체 개수와 같다.", explanationFocus: "행·열 중 선택한 묶음 기준이 식의 각 수와 어떻게 연결되는지 설명한다." },
  3: { mathematicalDecision: "줄과 칸 중 어느 구조로 전체를 빠르게 확인할지 결정한다.", misconception: "전체를 하나씩 세고 배열의 구조를 식에 쓰지 않는다.", invariant: "행과 열을 바꾸어도 같은 전체 개수가 보존된다.", explanationFocus: "줄 수와 한 줄의 수를 곱해 전체를 확인한 근거를 설명한다." },
  4: { mathematicalDecision: "34를 30과 4로 나누어 부분곱을 만들지 결정한다.", misconception: "일의 자리와 십의 자리의 값을 분리하지 않고 34를 한 덩어리로 다룬다.", invariant: "34×2=(30×2)+(4×2)로 전체 곱이 보존된다.", explanationFocus: "자릿값으로 나눈 두 부분곱을 더하면 같은 전체가 되는 까닭을 설명한다." },
  5: { mathematicalDecision: "상자 수를 자릿값에 따라 나누어 곱셈 순서를 정한다.", misconception: "숫자 모양만 보고 부분곱 하나를 빠뜨리거나 자릿값을 섞는다.", invariant: "각 자릿값의 부분곱 합은 원래 곱셈의 전체값이다.", explanationFocus: "각 상자 묶음이 어느 자릿값을 나타내는지와 부분곱의 합을 설명한다." },
  6: { mathematicalDecision: "18개를 같은 수씩 나눌 때 한 묶음의 크기와 묶음 수 중 무엇을 구할지 결정한다.", misconception: "나누는 수와 몫이 나타내는 대상을 서로 바꾼다.", invariant: "전체 개수=한 묶음의 수×묶음 수이다.", explanationFocus: "같은 묶음으로 나눈 모형과 나눗셈식의 각 수를 연결한다." },
  7: { mathematicalDecision: "곱셈의 빈칸에 들어갈 수가 묶음 수인지 한 묶음의 수인지 결정한다.", misconception: "나눗셈 상황에서 알려진 수와 구할 수의 역할을 바꾼다.", invariant: "곱셈식의 두 요인과 전체가 나눗셈식의 세 수로 서로 연결된다.", explanationFocus: "빈칸의 수가 무엇을 뜻하는지 곱셈·나눗셈 관계로 설명한다." },
  8: { mathematicalDecision: "한 곱셈식에서 만들 수 있는 두 나눗셈식을 골라 관계를 확인한다.", misconception: "곱셈의 수를 그대로 나눗셈식의 순서에 옮긴다.", invariant: "두 요인을 번갈아 나누면 같은 곱셈의 전체가 복원된다.", explanationFocus: "곱셈식 하나가 두 나눗셈식으로 이어지는 이유를 설명한다." },
  9: { mathematicalDecision: "몇 묶음인지와 한 묶음의 수를 곱셈으로 확인할지 결정한다.", misconception: "묶음 그림을 보고 남은 낱개를 몫에 포함한다.", invariant: "묶음 수×한 묶음의 수+남은 수=처음 수이다.", explanationFocus: "묶음 모형과 곱셈식이 처음 개수를 되돌려 주는지 설명한다." },
  10: { mathematicalDecision: "분수로 나타내려는 전체를 똑같이 나누었는지 결정한다.", misconception: "조각의 모양이나 크기가 달라도 조각 수만 세면 된다고 생각한다.", invariant: "분모는 같은 크기의 전체 조각 수이고 분자는 그중 선택한 조각 수이다.", explanationFocus: "똑같이 나눈 전체가 분수의 기준이 되는 까닭을 설명한다." },
  11: { mathematicalDecision: "같지 않은 조각을 어떻게 다시 나누어 분수의 전체를 만들지 결정한다.", misconception: "조각 수만 맞으면 크기가 달라도 분수로 쓸 수 있다고 생각한다.", invariant: "한 전체를 이루는 조각의 크기가 같아야 분모가 하나의 단위가 된다.", explanationFocus: "조각을 고친 뒤 분모와 분자가 무엇을 세는지 설명한다." },
  12: { mathematicalDecision: "전체와 그중 색칠한 부분을 어떤 분수로 읽을지 결정한다.", misconception: "분자와 분모의 위치 또는 전체·부분의 역할을 바꾼다.", invariant: "분모=전체의 같은 조각 수, 분자=색칠한 조각 수이다.", explanationFocus: "전체를 몇 조각으로 나누었고 그중 몇 조각인지 설명한다." },
  13: { mathematicalDecision: "피자 전체 조각 수와 선택한 조각 수를 분모·분자로 정한다.", misconception: "색칠한 수를 분모로, 전체 조각 수를 분자로 쓴다.", invariant: "같은 크기의 전체 조각 수가 분모로 고정된다.", explanationFocus: "피자 조각을 세어 분모와 분자의 역할을 설명한다." },
  14: { mathematicalDecision: "연필과 문에 알맞은 길이 단위를 선택한다.", misconception: "모든 길이를 cm 또는 가장 익숙한 단위 하나로만 잰다.", invariant: "대상의 크기와 단위의 크기를 비교하면 알맞은 단위를 고를 수 있다.", explanationFocus: "선택한 단위가 대상의 길이에 알맞은 까닭을 설명한다." },
  15: { mathematicalDecision: "각 대상의 크기에 맞는 길이 단위를 고르고 어림값을 비교한다.", misconception: "단위의 이름만 보고 대상의 실제 크기를 고려하지 않는다.", invariant: "같은 길이도 단위 크기에 따라 수치가 달라지지만 실제 길이는 같다.", explanationFocus: "단위 선택과 실제 대상의 크기를 연결해 설명한다." },
  16: { mathematicalDecision: "m·cm 또는 km·m를 작은 단위 묶음으로 바꾸어 같은 길이를 나타낸다.", misconception: "단위 사이 관계를 10배·100배로 잘못 바꾸거나 숫자만 옮긴다.", invariant: "큰 단위 1개와 그에 해당하는 작은 단위 묶음은 같은 길이다.", explanationFocus: "단위 묶음 교환 전후에 길이가 같다는 근거를 설명한다." },
  17: { mathematicalDecision: "두 자리 수를 자릿값에 따라 나누어 먼저 계산할 부분을 정한다.", misconception: "십의 자리 수를 한 자리 수처럼 다루거나 일의 자리 부분을 빠뜨린다.", invariant: "(십의 자리 부분×수)+(일의 자리 부분×수)=전체 곱이다.", explanationFocus: "자릿값 분해가 곱셈 계산을 돕는 까닭을 설명한다." },
  18: { mathematicalDecision: "부분곱을 어떤 순서로 더해 전체 곱을 완성할지 결정한다.", misconception: "부분곱의 자릿값 위치를 맞추지 않고 더한다.", invariant: "각 부분곱의 자리 정렬 후 합은 원래 곱셈의 전체값이다.", explanationFocus: "부분곱의 위치와 합이 전체 곱과 같은 이유를 설명한다." },
  19: { mathematicalDecision: "두 자리 수를 나누어 곱셈의 부분곱을 구성한다.", misconception: "두 자리 수를 분해하지 않고 한 부분곱만 사용한다.", invariant: "두 자릿값 부분곱을 합하면 분배법칙에 따라 전체 곱이 된다.", explanationFocus: "나눈 두 부분이 원래 수를 빠짐없이 이루는지 설명한다." },
  20: { mathematicalDecision: "나눗셈에서 묶음의 크기를 묻는지 묶음 수를 묻는지 구분한다.", misconception: "등분할과 포함제 상황의 물음을 같은 방식으로 읽는다.", invariant: "전체=한 묶음의 수×묶음 수가 두 상황에서 모두 성립한다.", explanationFocus: "질문이 바뀌어도 곱셈 관계가 유지되는 까닭을 설명한다." },
  21: { mathematicalDecision: "먼저 만들 수 있는 같은 묶음 수와 남는 수를 정한다.", misconception: "남은 수를 몫에 넣거나 묶음 크기보다 크게 남긴다.", invariant: "처음 수=나누는 수×몫+나머지이고 나머지는 나누는 수보다 작다.", explanationFocus: "묶음 모형에서 몫과 나머지를 각각 읽는 근거를 설명한다." },
  22: { mathematicalDecision: "몫과 나머지로 나누기 전의 처음 수를 되돌릴지 결정한다.", misconception: "몫과 나머지를 더해 처음 수를 찾거나 나누는 수를 빠뜨린다.", invariant: "나누는 수×몫+나머지=나누어지는 수이다.", explanationFocus: "곱셈과 덧셈으로 처음 수를 복원하는 과정을 설명한다." },
  23: { mathematicalDecision: "원에서 중심과 반지름을 나타내는 점·선을 선택한다.", misconception: "원의 가장자리 점을 중심으로 읽거나 원의 테두리를 반지름으로 생각한다.", invariant: "반지름은 중심에서 원 위 점까지의 선분이며 길이가 같다.", explanationFocus: "선분의 시작점과 끝점으로 중심·반지름을 설명한다." },
  24: { mathematicalDecision: "중심을 지나 반지름 두 개가 이어지는 선분을 지름으로 판단한다.", misconception: "반지름 하나를 지름이라고 하거나 중심을 지나지 않는 선을 지름으로 고른다.", invariant: "지름=반지름 두 개이고 반드시 중심을 지난다.", explanationFocus: "두 반지름의 연결과 중심 통과가 지름의 조건임을 설명한다." },
  25: { mathematicalDecision: "같은 전체를 나눈 조각 중 색칠한 부분을 분수로 나타낸다.", misconception: "전체 조각 수와 색칠한 조각 수의 역할을 바꾼다.", invariant: "분모는 전체의 같은 조각 수, 분자는 색칠한 조각 수이다.", explanationFocus: "색칠한 조각과 전체 조각을 각각 세어 분수를 설명한다." },
  26: { mathematicalDecision: "가분수의 몇 개 전체와 남은 단위분수를 대분수로 바꾼다.", misconception: "분자를 분모로 나누지 않고 두 수를 그대로 대분수 자리에 옮긴다.", invariant: "가분수와 대분수는 같은 전체 단위와 남은 조각을 나타낸다.", explanationFocus: "몫은 전체 수, 나머지는 남은 분자라는 관계를 설명한다." },
  27: { mathematicalDecision: "분모가 같은 두 분수에서 어느 조각 수가 더 큰지 결정한다.", misconception: "분모 숫자가 큰 분수를 더 큰 분수로 읽는다.", invariant: "같은 크기의 단위분수에서는 분자가 나타내는 조각 수가 크기를 결정한다.", explanationFocus: "같은 분모가 단위 크기를 같게 만드는 까닭과 조각 수를 설명한다." },
  28: { mathematicalDecision: "L와 mL 사이의 묶음 관계로 같은 들이를 나타낸다.", misconception: "1L=100mL처럼 1000배 관계를 잘못 적용한다.", invariant: "1L=1000mL이며 큰 단위와 작은 단위 표현의 실제 들이는 같다.", explanationFocus: "큰 단위 한 묶음이 작은 단위 몇 개인지 근거를 설명한다." },
  29: { mathematicalDecision: "kg과 g 사이의 묶음 관계로 같은 무게를 나타낸다.", misconception: "1kg=100g처럼 1000배 관계를 잘못 적용한다.", invariant: "1kg=1000g이며 단위 표현만 달라지고 실제 무게는 같다.", explanationFocus: "kg 한 묶음과 g 낱개의 관계로 변환을 설명한다." },
  30: { mathematicalDecision: "두 그림그래프 행의 실제 수량을 범례로 바꾸어 차이를 결정한다.", misconception: "그림 개수의 차이를 실제 수량의 차이로 그대로 읽는다.", invariant: "그림 개수 차이×범례 단위=실제 수량 차이이다.", explanationFocus: "그림 차이가 범례를 거쳐 실제 차이로 바뀌는 과정을 설명한다." }
};

const entryByNumber = (number: number): PilotLedgerEntry => {
  const binding = familyByEntry[number];
  const details = entryDetails[number];
  if (!binding || !details) throw new Error(`pilot entry definition missing: ${number}`);
  const standardDefinition = standardDefinitions[binding.standard];
  const learningMap = learningMapDefinitions[binding.standard];
  const unit = unitById[binding.unitId];
  const pptUnit = pptUnitByNumber[number];
  if (!standardDefinition || !learningMap || !unit || !pptUnit) {
    throw new Error(`pilot binding missing: ${number}`);
  }
  const blueprint = blueprintFamilies[binding.blueprint];
  const affordance = nativeAffordances[binding.affordance];
  const layout = layoutFamilies[binding.layout];
  if (!blueprint || !affordance || !layout) {
    throw new Error(`pilot family missing: ${number}`);
  }
  const source = {
    ...standardAuthority,
    locator: standardDefinition.locator
  };
  const prerequisiteStandardCodes = binding.crossBand
    ? [binding.crossBand]
    : [];
  const crossBandReview = binding.crossBand
    ? {
        standardCode: binding.crossBand,
        reason:
          binding.crossBand === "[2수03-10]"
            ? "길이 단위 선택 전 2학년의 길이 측정과 단위 감각을 되살린다."
            : "곱셈의 의미와 같은 묶음 관계를 먼저 떠올린 뒤 3–4학년 수와 연산을 확인한다.",
        teacherLabel: "선수 학습 복습" as const,
        unit: crossBandUnitByCode[binding.crossBand]
      }
    : undefined;
  return {
    sourceId: `ppt-${String(number).padStart(2, "0")}`,
    title: titles[number - 1]!,
    pptLocator: pptLocators[number]!,
    grade: 3,
    semester: number === 1 || number >= 17 ? 2 : 1,
    unit: {
      unitId: unit.id,
      grade: unit.grade,
      semester: unit.semester,
      unitNumber: unit.unitNumber,
      title: unit.title,
      source: unitAuthorities[unit.semester]
    },
    pptUnit,
    unitMappingNote:
      pptUnit.unitNumber === unit.unitNumber && pptUnit.title === unit.title
        ? "PPT 원고의 단원 번호·이름과 비상교육 목차가 일치하여 그대로 결속했다. unit authority는 비상교육 목차다."
        : `PPT 원고의 ${pptUnit.semester}학기 ${pptUnit.unitNumber}. ${pptUnit.title}을 비상교육 목차의 ${unit.semester}학기 ${unit.unitNumber}. ${unit.title}으로 교정했다. 단원 authority는 비상교육 목차를 우선한다.`,
    domain: standardDefinition.domain,
    learningType: "기본 연습",
    standard: {
      code: binding.standard,
      gradeBand: "3-4",
      domain: standardDefinition.domain,
      officialGoal: standardDefinition.officialGoal,
      source
    },
    prerequisiteStandardCodes,
    ...(crossBandReview ? { crossBandReview } : {}),
    learningMap: {
      ...learningMap,
      observableEvidence: [learningMap.observableEvidence],
      assessmentPrompt: learningMap.assessmentPrompt
        .replaceAll("‘", "'")
        .replaceAll("’", "'"),
      sourceRecordKey: `fixture:grade-3-pilot-learning-map.used.json#${binding.standard}`
    },
    ...details,
    nativeAffordance: affordance,
    blueprintFamily: blueprint,
    variationPreset: variationPreset(
      binding.variation ??
        `${blueprint.id.replace(/-v1$/, "")}-${String(number).padStart(2, "0")}-basic-v1`,
      details.mathematicalDecision
    ),
    layoutFamily: layout,
    retainedPptStages: [2, 5, 8, 9],
    excludedPptStages: [1, 3, 4, 6, 7, 10, 11],
    phaseSourceStages: {
      prediction: [2],
      "mathematical-confirmation": [5, 8],
      explanation: [9],
      // PPT stage 10 is a new three-problem exit ticket, not a revision of
      // the initial prediction. Revision is derived by comparing stages 2 and 9.
      revision: [2, 9]
    },
    screenSequence: [
      "prediction",
      "mathematical-confirmation",
      "explanation",
      "revision"
    ],
    r1State: "reviewed"
  };
};

export const grade3PilotLedger = defineGrade3PilotLedger({
  schemaVersion: "1.0.0",
  sourceManifest,
  entries: Array.from({ length: 30 }, (_, index) => entryByNumber(index + 1))
});

export const grade3PilotEntries = grade3PilotLedger.entries;
export const grade3PilotSourceManifest = grade3PilotLedger.sourceManifest;
export const grade3PilotStandardCodes = standardCodes;

export function findGrade3PilotEntry(
  sourceId: string
): PilotLedgerEntry | undefined {
  return grade3PilotEntries.find((entry) => entry.sourceId === sourceId);
}

export function getGrade3PilotCoverage(): {
  total: number;
  bySemester: Record<1 | 2, number>;
  byDomain: Record<Domain, number>;
  byBlueprintFamily: Readonly<Record<string, number>>;
  byAffordanceFamily: Readonly<Record<string, number>>;
  byLayoutFamily: Readonly<Record<string, number>>;
} {
  const bySemester: Record<1 | 2, number> = { 1: 0, 2: 0 };
  const byDomain: Record<Domain, number> = {
    "수와 연산": 0,
    "변화와 관계": 0,
    "도형과 측정": 0,
    "자료와 가능성": 0
  };
  const count = (values: readonly string[]) =>
    values.reduce<Record<string, number>>((result, value) => {
      result[value] = (result[value] ?? 0) + 1;
      return result;
    }, {});
  return {
    total: grade3PilotEntries.length,
    bySemester: grade3PilotEntries.reduce((result, entry) => {
      result[entry.semester] += 1;
      return result;
    }, bySemester),
    byDomain: grade3PilotEntries.reduce((result, entry) => {
      result[entry.domain] += 1;
      return result;
    }, byDomain),
    byBlueprintFamily: count(
      grade3PilotEntries.map((entry) => entry.blueprintFamily.id)
    ),
    byAffordanceFamily: count(
      grade3PilotEntries.map((entry) => entry.nativeAffordance.affordanceFamilyId)
    ),
    byLayoutFamily: count(
      grade3PilotEntries.map((entry) => entry.layoutFamily.id)
    )
  };
}
