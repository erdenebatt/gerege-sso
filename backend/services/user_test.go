package services

import (
	"fmt"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
)

// =============================================================================
// Latin-to-Cyrillic Conversion Tests
// =============================================================================

func TestLatinToCyrillic_BasicConversion(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "uppercase Latin A→Cyrillic А",
			input:    "AA12345678",
			expected: "АА12345678",
		},
		{
			name:     "mixed case Latin",
			input:    "Ma74101813",
			expected: "Ма74101813",
		},
		{
			name:     "all Cyrillic already",
			input:    "МА74101813",
			expected: "МА74101813",
		},
		{
			name:     "lowercase Latin letters",
			input:    "ab12345678",
			expected: "ав12345678",
		},
		{
			name:     "all mappable uppercase Latin",
			input:    "ABCEHKMOPTY",
			expected: "АВСЕНКМОРТУ",
		},
		{
			name:     "digits only - no change",
			input:    "1234567890",
			expected: "1234567890",
		},
		{
			name:     "empty string",
			input:    "",
			expected: "",
		},
		{
			name:     "non-mappable Latin stays",
			input:    "DG12345678",
			expected: "DG12345678",
		},
		{
			name:     "X maps to Х",
			input:    "XY12345678",
			expected: "ХУ12345678",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := latinToCyrillic(tt.input)
			if got != tt.expected {
				t.Errorf("latinToCyrillic(%q) = %q, want %q", tt.input, got, tt.expected)
			}
		})
	}
}

func TestLatinToCyrillic_MatchesDBLookup(t *testing.T) {
	// Simulates the full normalization: latinToCyrillic + ToUpper
	// Ensures "AA12345678" (Latin) matches "АА12345678" (Cyrillic) after conversion
	input := "AA12345678"
	converted := latinToCyrillic(input)
	expected := "АА12345678" // Cyrillic А

	if converted != expected {
		t.Errorf("Latin 'AA12345678' should convert to Cyrillic equivalent, got %q (bytes: %v) want %q (bytes: %v)",
			converted, []byte(converted), expected, []byte(expected))
	}
}

func TestLatinToCyrillic_CyrillicVsLatinBytes(t *testing.T) {
	// Verify that Latin 'A' (0x41) and Cyrillic 'А' (0xD0 0x90) are different bytes
	latinA := "A"
	cyrillicA := "А"

	if latinA == cyrillicA {
		t.Error("Latin A and Cyrillic А should be different strings")
	}

	converted := latinToCyrillic(latinA)
	if converted != cyrillicA {
		t.Errorf("latinToCyrillic(%q) = %q, want Cyrillic А", latinA, converted)
	}
}

// =============================================================================
// LinkCitizen Transaction Tests
// =============================================================================

func TestLinkCitizen_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	genIDService := &GenIDService{db: db}
	userService := NewUserService(db, genIDService, nil)

	mock.ExpectBegin()

	// Citizen lookup with FOR UPDATE
	mock.ExpectQuery(`SELECT id FROM citizens WHERE UPPER\(reg_no\) = \$1 FOR UPDATE`).
		WithArgs("АА12345678").
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(42))

	// User row lock + gen_id check
	mock.ExpectQuery(`SELECT gen_id FROM users WHERE id = \$1 FOR UPDATE`).
		WithArgs(int64(1)).
		WillReturnRows(sqlmock.NewRows([]string{"gen_id"}).AddRow("12345678901"))

	// Update user
	mock.ExpectExec(`UPDATE users SET citizen_id = \$1, gen_id = \$2, verified = true WHERE id = \$3`).
		WithArgs(int64(42), "12345678901", int64(1)).
		WillReturnResult(sqlmock.NewResult(0, 1))

	mock.ExpectCommit()

	// Input uses Latin 'AA' which converts to Cyrillic 'АА'
	err = userService.LinkCitizen(1, "AA12345678")
	if err != nil {
		t.Errorf("LinkCitizen() unexpected error: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet expectations: %v", err)
	}
}

func TestLinkCitizen_CitizenNotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	genIDService := &GenIDService{db: db}
	userService := NewUserService(db, genIDService, nil)

	mock.ExpectBegin()

	// Citizen not found
	mock.ExpectQuery(`SELECT id FROM citizens WHERE UPPER\(reg_no\) = \$1 FOR UPDATE`).
		WithArgs("ZZ99999999").
		WillReturnRows(sqlmock.NewRows([]string{"id"})) // empty result set

	mock.ExpectRollback()

	err = userService.LinkCitizen(1, "ZZ99999999")
	if err == nil {
		t.Error("LinkCitizen() expected error for missing citizen, got nil")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet expectations: %v", err)
	}
}

func TestLinkCitizen_UserNotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	genIDService := &GenIDService{db: db}
	userService := NewUserService(db, genIDService, nil)

	mock.ExpectBegin()

	// Citizen found
	mock.ExpectQuery(`SELECT id FROM citizens WHERE UPPER\(reg_no\) = \$1 FOR UPDATE`).
		WithArgs("АА12345678").
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(42))

	// User not found
	mock.ExpectQuery(`SELECT gen_id FROM users WHERE id = \$1 FOR UPDATE`).
		WithArgs(int64(999)).
		WillReturnRows(sqlmock.NewRows([]string{"gen_id"})) // empty

	mock.ExpectRollback()

	err = userService.LinkCitizen(999, "АА12345678")
	if err == nil {
		t.Error("LinkCitizen() expected error for missing user, got nil")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet expectations: %v", err)
	}
}

func TestLinkCitizen_UpdateFails_Rollback(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	genIDService := &GenIDService{db: db}
	userService := NewUserService(db, genIDService, nil)

	mock.ExpectBegin()

	// Citizen found
	mock.ExpectQuery(`SELECT id FROM citizens WHERE UPPER\(reg_no\) = \$1 FOR UPDATE`).
		WithArgs("АА12345678").
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(42))

	// User found with gen_id
	mock.ExpectQuery(`SELECT gen_id FROM users WHERE id = \$1 FOR UPDATE`).
		WithArgs(int64(1)).
		WillReturnRows(sqlmock.NewRows([]string{"gen_id"}).AddRow("12345678901"))

	// Update fails
	mock.ExpectExec(`UPDATE users SET citizen_id = \$1, gen_id = \$2, verified = true WHERE id = \$3`).
		WithArgs(int64(42), "12345678901", int64(1)).
		WillReturnError(fmt.Errorf("constraint violation"))

	mock.ExpectRollback()

	err = userService.LinkCitizen(1, "АА12345678")
	if err == nil {
		t.Error("LinkCitizen() expected error on UPDATE failure, got nil")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet expectations: %v", err)
	}
}

func TestLinkCitizen_GeneratesGenID_WhenMissing(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	genIDService := &GenIDService{db: db}
	userService := NewUserService(db, genIDService, nil)

	mock.ExpectBegin()

	// Citizen found
	mock.ExpectQuery(`SELECT id FROM citizens WHERE UPPER\(reg_no\) = \$1 FOR UPDATE`).
		WithArgs("АА12345678").
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(42))

	// User has NULL gen_id
	mock.ExpectQuery(`SELECT gen_id FROM users WHERE id = \$1 FOR UPDATE`).
		WithArgs(int64(1)).
		WillReturnRows(sqlmock.NewRows([]string{"gen_id"}).AddRow(nil))

	// Check for existing gen_id from same citizen (none found)
	mock.ExpectQuery(`SELECT gen_id FROM users WHERE citizen_id = \$1 AND id != \$2`).
		WithArgs(int64(42), int64(1)).
		WillReturnRows(sqlmock.NewRows([]string{"gen_id"}))

	// GenIDService.GenerateWithTx checks uniqueness
	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM users WHERE gen_id = \$1`).
		WithArgs(sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

	// Update with generated gen_id
	mock.ExpectExec(`UPDATE users SET citizen_id = \$1, gen_id = \$2, verified = true WHERE id = \$3`).
		WithArgs(int64(42), sqlmock.AnyArg(), int64(1)).
		WillReturnResult(sqlmock.NewResult(0, 1))

	mock.ExpectCommit()

	err = userService.LinkCitizen(1, "АА12345678")
	if err != nil {
		t.Errorf("LinkCitizen() unexpected error: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet expectations: %v", err)
	}
}

// =============================================================================
// GenIDService Tests
// =============================================================================

func TestGenIDService_Generate_Format(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	genIDService := NewGenIDService(db)

	// Expect uniqueness check — return 0 (no collision)
	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM users WHERE gen_id = \$1`).
		WithArgs(sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

	genID, err := genIDService.Generate()
	if err != nil {
		t.Fatalf("Generate() unexpected error: %v", err)
	}

	// Must be exactly 11 digits
	if len(genID) != 11 {
		t.Errorf("Generate() returned %q with length %d, want 11", genID, len(genID))
	}

	// Must not start with 0
	if genID[0] == '0' {
		t.Errorf("Generate() returned %q which starts with 0", genID)
	}

	// Must be all digits
	for _, c := range genID {
		if c < '0' || c > '9' {
			t.Errorf("Generate() returned %q which contains non-digit %c", genID, c)
		}
	}
}

func TestGenIDService_Generate_RetriesOnCollision(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	genIDService := NewGenIDService(db)

	// First attempt: collision (count=1)
	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM users WHERE gen_id = \$1`).
		WithArgs(sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

	// Second attempt: no collision (count=0)
	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM users WHERE gen_id = \$1`).
		WithArgs(sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

	genID, err := genIDService.Generate()
	if err != nil {
		t.Fatalf("Generate() unexpected error: %v", err)
	}

	if len(genID) != 11 {
		t.Errorf("Generate() returned %q with length %d, want 11", genID, len(genID))
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet expectations: %v", err)
	}
}

func TestGenIDService_Generate_FailsAfterMaxAttempts(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	genIDService := NewGenIDService(db)

	// All 10 attempts collide
	for i := 0; i < 10; i++ {
		mock.ExpectQuery(`SELECT COUNT\(\*\) FROM users WHERE gen_id = \$1`).
			WithArgs(sqlmock.AnyArg()).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))
	}

	_, err = genIDService.Generate()
	if err == nil {
		t.Error("Generate() expected error after max attempts, got nil")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet expectations: %v", err)
	}
}

func TestGenIDService_GenerateWithTx(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	genIDService := NewGenIDService(db)

	mock.ExpectBegin()

	// Uniqueness check within tx
	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM users WHERE gen_id = \$1`).
		WithArgs(sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("failed to begin tx: %v", err)
	}

	genID, err := genIDService.GenerateWithTx(tx)
	if err != nil {
		t.Fatalf("GenerateWithTx() unexpected error: %v", err)
	}

	if len(genID) != 11 {
		t.Errorf("GenerateWithTx() returned %q with length %d, want 11", genID, len(genID))
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet expectations: %v", err)
	}
}

func TestGenIDService_RandomDistribution(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	genIDService := NewGenIDService(db)

	seen := make(map[string]bool)
	for i := 0; i < 100; i++ {
		mock.ExpectQuery(`SELECT COUNT\(\*\) FROM users WHERE gen_id = \$1`).
			WithArgs(sqlmock.AnyArg()).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))
	}

	for i := 0; i < 100; i++ {
		genID, err := genIDService.Generate()
		if err != nil {
			t.Fatalf("Generate() attempt %d unexpected error: %v", i, err)
		}
		if seen[genID] {
			t.Errorf("Generate() produced duplicate %q on attempt %d", genID, i)
		}
		seen[genID] = true
	}
}
