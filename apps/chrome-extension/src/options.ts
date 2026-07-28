const secretInput = document.querySelector<HTMLInputElement>("#pairingSecret");
const saveButton = document.querySelector<HTMLButtonElement>("#saveButton");
const status = document.querySelector<HTMLParagraphElement>("#status");

if (!secretInput || !saveButton || !status) {
  throw new Error("연결 설정 화면을 불러오지 못했습니다.");
}

const stored = await chrome.storage.local.get(["pairingSecret"]);
if (
  typeof stored.pairingSecret === "string" &&
  /^[a-f0-9]{64}$/.test(stored.pairingSecret)
) {
  status.textContent =
    "연결 코드가 저장되어 있어요. 바꾸려면 새 코드를 입력하세요.";
}

saveButton.addEventListener("click", async () => {
  const secret = secretInput.value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(secret)) {
    status.textContent = "설치 안내에 나온 64자리 연결 코드를 확인해 주세요.";
    secretInput.focus();
    return;
  }
  await chrome.storage.local.set({ pairingSecret: secret });
  secretInput.value = "";
  status.textContent = "저장했어요. MathCanvas의 ‘내 캔버스’를 열어 주세요.";
  await chrome.runtime.sendMessage({ type: "poll-now" });
});
