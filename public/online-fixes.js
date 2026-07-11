(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const cleanCode = (value) => String(value || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 6);

  const netRoom = $("netRoom");
  const netPlayers = $("netPlayers");
  const netStart = $("netStart");
  const netCode = $("netCode");
  if (!netRoom || !netPlayers || !netStart || !netCode) return;

  netCode.placeholder = "ABCDEF";
  netCode.autocapitalize = "characters";
  netCode.spellcheck = false;
  netCode.addEventListener("input", () => {
    netCode.value = cleanCode(netCode.value);
  });

  const copyCode = $("netCopy");
  const copyLink = document.createElement("button");
  copyLink.type = "button";
  copyLink.className = "chip";
  copyLink.id = "netCopyLink";
  copyLink.textContent = "🔗 Afrita boðshlekk";
  if (copyCode) {
    let row = copyCode.parentElement;
    if (!row || !row.classList.contains("row")) {
      row = document.createElement("div");
      row.className = "row";
      row.style.margin = "4px 0 8px";
      copyCode.replaceWith(row);
      row.append(copyCode);
    }
    row.append(copyLink);
  }

  const hostControls = document.createElement("div");
  hostControls.id = "netHostControls";
  hostControls.className = "hidden";
  hostControls.innerHTML = `
    <div class="netDivider">STILLINGAR GESTGJAFA</div>
    <div class="row">
      <button class="chip" type="button" data-diff="0">🙂 Auðvelt</button>
      <button class="chip" type="button" data-diff="1">😨 Venjulegt</button>
      <button class="chip" type="button" data-diff="2">💀 Martröð</button>
    </div>
    <div class="row" style="margin:2px 0 8px">
      <button class="chip" type="button" id="netSoft">👻 Hryllingur: venjulegur</button>
    </div>`;
  netRoom.insertBefore(hostControls, netStart);

  const diffButtons = [...hostControls.querySelectorAll("[data-diff]")];
  const netSoft = $("netSoft");

  function syncSettings() {
    for (let i = 0; i < 3; i++) {
      const selected = $("d" + i)?.classList.contains("sel");
      diffButtons[i]?.classList.toggle("sel", !!selected);
    }
    const soft = $("soft");
    if (soft && netSoft) {
      netSoft.textContent = soft.textContent;
      netSoft.classList.toggle("sel", soft.classList.contains("sel"));
    }
  }

  diffButtons.forEach((button) => {
    button.addEventListener("click", () => {
      $("d" + button.dataset.diff)?.click();
      syncSettings();
    });
  });
  netSoft?.addEventListener("click", () => {
    $("soft")?.click();
    syncSettings();
  });

  function isCurrentPlayerHost() {
    return [...netPlayers.querySelectorAll(".playerRow")].some((row) =>
      row.querySelector(".you") && row.querySelector(".host")
    );
  }

  function syncLobby() {
    const host = isCurrentPlayerHost();
    hostControls.classList.toggle("hidden", !host);
    syncSettings();

    const room = cleanCode($("netRoomCode")?.textContent);
    if (!netRoom.classList.contains("hidden") && room.length === 6) {
      try {
        history.replaceState(null, "", location.pathname + "?room=" + encodeURIComponent(room));
      } catch (_) {}
    }
  }

  new MutationObserver(syncLobby).observe(netPlayers, {
    childList: true,
    subtree: true,
    attributes: true,
  });
  new MutationObserver(syncLobby).observe(netRoom, {
    attributes: true,
    attributeFilter: ["class"],
  });

  copyLink.addEventListener("click", async () => {
    const room = cleanCode($("netRoomCode")?.textContent);
    if (room.length !== 6) return;
    const link = location.origin + location.pathname + "?room=" + encodeURIComponent(room);
    try {
      await navigator.clipboard.writeText(link);
      const status = $("netStatus");
      if (status) {
        status.textContent = "Boðshlekkurinn var afritaður.";
        status.className = "netStatus ok";
      }
    } catch (_) {
      window.prompt("Afritaðu boðshlekkinn:", link);
    }
  });

  $("netBack")?.addEventListener("click", () => {
    try { history.replaceState(null, "", location.pathname); } catch (_) {}
  });

  const invitedRoom = cleanCode(new URL(location.href).searchParams.get("room"));
  if (invitedRoom.length === 6) {
    $("bnet")?.click();
    netCode.value = invitedRoom;
    const status = $("netStatus");
    if (status) {
      status.textContent = "Boðshlekkur opnaður. Sláðu inn nafn og veldu „Tengjast leik“.";
      status.className = "netStatus ok";
    }
  }

  syncLobby();
})();
