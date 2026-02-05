package services

import (
	"crypto/rand"
	"database/sql"
	"fmt"
	"math/big"
)

// GenIDService handles generation of unique 11-digit IDs
type GenIDService struct {
	db *sql.DB
}

// NewGenIDService creates a new GenIDService
func NewGenIDService(db *sql.DB) *GenIDService {
	return &GenIDService{db: db}
}

// Generate creates a new unique 11-digit gen_id
func (s *GenIDService) Generate() (string, error) {
	maxAttempts := 10

	for i := 0; i < maxAttempts; i++ {
		genID, err := s.generateRandom11Digit()
		if err != nil {
			return "", fmt.Errorf("failed to generate random ID: %w", err)
		}

		// Check if gen_id already exists
		exists, err := s.exists(genID)
		if err != nil {
			return "", fmt.Errorf("failed to check ID existence: %w", err)
		}

		if !exists {
			return genID, nil
		}
	}

	return "", fmt.Errorf("failed to generate unique ID after %d attempts", maxAttempts)
}

// generateRandom11Digit generates a random 11-digit number string
func (s *GenIDService) generateRandom11Digit() (string, error) {
	// Generate number between 10000000000 and 99999999999
	min := big.NewInt(10000000000)
	max := big.NewInt(99999999999)

	// Calculate range
	rangeSize := new(big.Int).Sub(max, min)
	rangeSize.Add(rangeSize, big.NewInt(1))

	// Generate random number in range
	n, err := rand.Int(rand.Reader, rangeSize)
	if err != nil {
		return "", err
	}

	// Add min to get final number
	n.Add(n, min)

	return n.String(), nil
}

// GenerateWithTx creates a unique 11-digit gen_id checking uniqueness within a transaction
func (s *GenIDService) GenerateWithTx(tx *sql.Tx) (string, error) {
	maxAttempts := 10

	for i := 0; i < maxAttempts; i++ {
		genID, err := s.generateRandom11Digit()
		if err != nil {
			return "", fmt.Errorf("failed to generate random ID: %w", err)
		}

		var count int
		err = tx.QueryRow("SELECT COUNT(*) FROM users WHERE gen_id = $1", genID).Scan(&count)
		if err != nil {
			return "", fmt.Errorf("failed to check ID existence: %w", err)
		}

		if count == 0 {
			return genID, nil
		}
	}

	return "", fmt.Errorf("failed to generate unique ID after %d attempts", maxAttempts)
}

// exists checks if a gen_id already exists in the database
func (s *GenIDService) exists(genID string) (bool, error) {
	var count int
	err := s.db.QueryRow("SELECT COUNT(*) FROM users WHERE gen_id = $1", genID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
