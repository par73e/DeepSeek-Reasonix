package main

import (
	"testing"

	"reasonix/internal/provider"
	"reasonix/internal/session"
)

func TestFirstMessageRefreshesReopenedEmptySessionTitle(t *testing.T) {
	app, tab, _, _, _ := canonicalWorkspaceOpenFixture(t)
	service := app.desktopSessionService("")
	runtime, err := service.Create(t.Context(), session.CreateOptions{
		SessionID: "delayed-first-message", CWD: tab.WorkspaceRoot, Origin: session.SessionOriginNew,
	})
	if err != nil {
		t.Fatal(err)
	}
	appendSessionTestModel(t, runtime, "model", tab.model)
	if err := app.workspaceRegistry().AttachSession(t.Context(), "", tab.SessionWorkspace.ID, runtime.Ref().SessionID, ""); err != nil {
		t.Fatal(err)
	}
	if err := app.workspaceRegistry().EnsureSessionTopic(t.Context(), runtime.Ref().SessionID, "delayed-topic", defaultTopicTitle); err != nil {
		t.Fatal(err)
	}
	if _, err := app.OpenSession(runtime.Ref()); err != nil {
		t.Fatal(err)
	}
	if got := app.tabMeta(tab, true).TopicTitle; got != app.localizedDefaultTopicTitle() {
		t.Fatalf("empty session title = %q", got)
	}
	if _, err := app.OpenSession(session.SessionRef{HostID: localDesktopHostID, SessionID: "session-A"}); err != nil {
		t.Fatal(err)
	}
	if _, err := app.OpenSession(runtime.Ref()); err != nil {
		t.Fatal(err)
	}
	appendSessionTestMessage(t, runtime, "first-user-message", provider.Message{
		ID: "first-user-message", Role: provider.RoleUser, Content: "Delayed first message",
	})
	app.tabSnapshotLoop(tab)
	if got := app.tabMeta(tab, true).TopicTitle; got != "Delayed first message" {
		t.Fatalf("reopened session title after its first message = %q", got)
	}
	if got := sidebarLabelForSession(t, app, tab.WorkspaceRoot, runtime.Ref()); got != "Delayed first message" {
		t.Fatalf("sidebar title = %q", got)
	}
}

func TestAutosaveTitleRefreshPreservesManualTitle(t *testing.T) {
	app, tab, target, ref := canonicalTitleFixture(t)
	if err := app.RenameCanonicalSession(ref, "Chosen title"); err != nil {
		t.Fatal(err)
	}
	runtime, ok := app.desktopSessionService("").Runtime(ref)
	if !ok {
		t.Fatal("session runtime missing")
	}
	appendSessionTestMessage(t, runtime, "later-message", provider.Message{
		ID: "later-message", Role: provider.RoleUser, Content: "Another message",
	})
	app.tabSnapshotLoop(tab)
	if got := app.tabMeta(tab, true).TopicTitle; got != "Chosen title" {
		t.Fatalf("manual title after autosave = %q", got)
	}
	if got := sidebarLabelForSession(t, app, tab.WorkspaceRoot, ref); got != "Chosen title" {
		t.Fatalf("manual sidebar title = %q", got)
	}
	if _, err := app.OpenSession(target.Ref()); err != nil {
		t.Fatal(err)
	}
	app.tabSnapshotLoop(tab)
	if got := app.tabMeta(tab, true).TopicTitle; got != "session-B" {
		t.Fatalf("other session title = %q", got)
	}
}
