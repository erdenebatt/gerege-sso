package services

import (
	"fmt"
	"testing"
)

// mockResolver implements IdentityResolver for testing
type mockResolver struct {
	name     string
	identity *ResolvedIdentity
	err      error
}

func (m *mockResolver) ResolveIdentity(searchText string) (*ResolvedIdentity, error) {
	return m.identity, m.err
}

func (m *mockResolver) Name() string {
	return m.name
}

func TestChainedResolver_FirstResolverWins(t *testing.T) {
	first := &mockResolver{
		name: "first",
		identity: &ResolvedIdentity{
			RegNo:     "АБ12345678",
			FirstName: "Бат",
			Source:    "first",
		},
	}
	second := &mockResolver{
		name: "second",
		identity: &ResolvedIdentity{
			RegNo:     "ВГ99999999",
			FirstName: "Болд",
			Source:    "second",
		},
	}

	chain := NewChainedResolver(first, second)
	result, err := chain.ResolveIdentity("АБ12345678")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	if result.Source != "first" {
		t.Errorf("expected source 'first', got '%s'", result.Source)
	}
	if result.FirstName != "Бат" {
		t.Errorf("expected FirstName 'Бат', got '%s'", result.FirstName)
	}
}

func TestChainedResolver_FallsThrough_OnNil(t *testing.T) {
	first := &mockResolver{name: "first", identity: nil, err: nil}
	second := &mockResolver{
		name: "second",
		identity: &ResolvedIdentity{
			RegNo:     "ВГ99999999",
			FirstName: "Болд",
			Source:    "second",
		},
	}

	chain := NewChainedResolver(first, second)
	result, err := chain.ResolveIdentity("test")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected result from second resolver, got nil")
	}
	if result.Source != "second" {
		t.Errorf("expected source 'second', got '%s'", result.Source)
	}
}

func TestChainedResolver_FallsThrough_OnError(t *testing.T) {
	first := &mockResolver{name: "first", identity: nil, err: fmt.Errorf("network error")}
	second := &mockResolver{
		name: "second",
		identity: &ResolvedIdentity{
			RegNo:  "АА00000000",
			Source: "second",
		},
	}

	chain := NewChainedResolver(first, second)
	result, err := chain.ResolveIdentity("test")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected result from second resolver after first failed")
	}
	if result.Source != "second" {
		t.Errorf("expected source 'second', got '%s'", result.Source)
	}
}

func TestChainedResolver_AllFail_ReturnsNil(t *testing.T) {
	first := &mockResolver{name: "first", identity: nil, err: fmt.Errorf("fail")}
	second := &mockResolver{name: "second", identity: nil, err: nil}

	chain := NewChainedResolver(first, second)
	result, err := chain.ResolveIdentity("test")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != nil {
		t.Errorf("expected nil result, got %+v", result)
	}
}

func TestChainedResolver_FiltersNilResolvers(t *testing.T) {
	resolver := &mockResolver{
		name:     "valid",
		identity: &ResolvedIdentity{RegNo: "АА11111111", Source: "valid"},
	}

	chain := NewChainedResolver(nil, resolver, nil)

	if !chain.HasResolvers() {
		t.Error("expected HasResolvers() = true")
	}

	result, err := chain.ResolveIdentity("test")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	if result.Source != "valid" {
		t.Errorf("expected source 'valid', got '%s'", result.Source)
	}
}

func TestChainedResolver_NoResolvers(t *testing.T) {
	chain := NewChainedResolver()

	if chain.HasResolvers() {
		t.Error("expected HasResolvers() = false for empty chain")
	}

	result, err := chain.ResolveIdentity("test")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != nil {
		t.Errorf("expected nil result, got %+v", result)
	}
}

func TestChainedResolver_Name(t *testing.T) {
	chain := NewChainedResolver()
	if chain.Name() != "chained" {
		t.Errorf("expected name 'chained', got '%s'", chain.Name())
	}
}

func TestGeregeCoreResolver_NilService(t *testing.T) {
	resolver := NewGeregeCoreResolver(nil)
	if resolver != nil {
		t.Error("expected nil resolver for nil GeregeCoreService")
	}
}
