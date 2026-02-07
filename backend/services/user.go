package services

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"gerege-sso/models"
)

// providerColumns maps provider names to their database column names.
// Used as a whitelist to prevent SQL injection.
var providerColumns = map[string]string{
	"google":   "google_sub",
	"apple":    "apple_sub",
	"facebook": "facebook_id",
	"twitter":  "twitter_id",
}

// userColumns is the standard set of columns selected for user queries
const userColumns = `id, gen_id, google_sub, apple_sub, facebook_id, twitter_id, email, email_verified, picture, citizen_id, verified, created_at, updated_at, last_login_at`

// UserService handles user-related operations
type UserService struct {
	db           *sql.DB
	genIDService *GenIDService
}

// NewUserService creates a new UserService
func NewUserService(db *sql.DB, genIDService *GenIDService) *UserService {
	return &UserService{
		db:           db,
		genIDService: genIDService,
	}
}

// scannable is an interface satisfied by both *sql.Row and *sql.Rows
type scannable interface {
	Scan(dest ...interface{}) error
}

// scanUser scans a user row into a User struct
func scanUser(row scannable) (*models.User, error) {
	user := &models.User{}
	err := row.Scan(
		&user.ID, &user.GenID, &user.GoogleSub, &user.AppleSub,
		&user.FacebookID, &user.TwitterID, &user.Email, &user.EmailVerified,
		&user.Picture, &user.CitizenID, &user.Verified,
		&user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan user: %w", err)
	}
	return user, nil
}

// loadCitizen loads citizen data for a user if citizen_id is set
func (s *UserService) loadCitizen(user *models.User) {
	if user != nil && user.CitizenID.Valid {
		citizen, err := s.FindCitizenByID(user.CitizenID.Int64)
		if err == nil {
			user.Citizen = citizen
		}
	}
}

// FindByProviderID finds a user by their provider-specific ID (unified method)
func (s *UserService) FindByProviderID(provider, providerID string) (*models.User, error) {
	col, ok := providerColumns[provider]
	if !ok {
		return nil, fmt.Errorf("unknown provider: %s", provider)
	}

	query := fmt.Sprintf("SELECT %s FROM users WHERE %s = $1", userColumns, col)
	user, err := scanUser(s.db.QueryRow(query, providerID))
	if err != nil {
		return nil, err
	}
	s.loadCitizen(user)
	return user, nil
}

// CreateFromProvider creates a new user from any OAuth provider (unified method)
func (s *UserService) CreateFromProvider(provider string, info *models.ProviderUserInfo) (*models.User, error) {
	col, ok := providerColumns[provider]
	if !ok {
		return nil, fmt.Errorf("unknown provider: %s", provider)
	}

	genID, err := s.genIDService.Generate()
	if err != nil {
		return nil, fmt.Errorf("failed to generate gen_id: %w", err)
	}

	email := info.Email
	if email == "" {
		email = info.ProviderID + "@" + provider + ".placeholder"
	}

	query := fmt.Sprintf(`
		INSERT INTO users (gen_id, %s, email, email_verified, picture, verified)
		VALUES ($1, $2, $3, $4, $5, false)
		RETURNING %s
	`, col, userColumns)

	user, err := scanUser(s.db.QueryRow(query, genID, info.ProviderID, email, info.EmailVerified, info.Picture))
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}
	return user, nil
}

// LinkProviderID links a provider account to an existing user (unified method)
func (s *UserService) LinkProviderID(userID int64, provider, providerID string) error {
	col, ok := providerColumns[provider]
	if !ok {
		return fmt.Errorf("unknown provider: %s", provider)
	}

	query := fmt.Sprintf("UPDATE users SET %s = $1 WHERE id = $2", col)
	_, err := s.db.Exec(query, providerID, userID)
	return err
}

// --- Legacy methods (thin wrappers for backward compatibility) ---

// FindByGoogleSub finds a user by their Google sub (ID)
func (s *UserService) FindByGoogleSub(googleSub string) (*models.User, error) {
	return s.FindByProviderID("google", googleSub)
}

// FindByAppleSub finds a user by their Apple sub (ID)
func (s *UserService) FindByAppleSub(appleSub string) (*models.User, error) {
	return s.FindByProviderID("apple", appleSub)
}

// FindByFacebookID finds a user by their Facebook ID
func (s *UserService) FindByFacebookID(facebookID string) (*models.User, error) {
	return s.FindByProviderID("facebook", facebookID)
}

// FindByTwitterID finds a user by their Twitter ID
func (s *UserService) FindByTwitterID(twitterID string) (*models.User, error) {
	return s.FindByProviderID("twitter", twitterID)
}

// LinkGoogleSub links a Google account to an existing user
func (s *UserService) LinkGoogleSub(userID int64, googleSub string) error {
	return s.LinkProviderID(userID, "google", googleSub)
}

// LinkAppleSub links an Apple account to an existing user
func (s *UserService) LinkAppleSub(userID int64, appleSub string) error {
	return s.LinkProviderID(userID, "apple", appleSub)
}

// LinkFacebookID links a Facebook account to an existing user
func (s *UserService) LinkFacebookID(userID int64, facebookID string) error {
	return s.LinkProviderID(userID, "facebook", facebookID)
}

// LinkTwitterID links a Twitter account to an existing user
func (s *UserService) LinkTwitterID(userID int64, twitterID string) error {
	return s.LinkProviderID(userID, "twitter", twitterID)
}

// Create creates a new user from Google info
func (s *UserService) Create(googleInfo *models.GoogleUserInfo) (*models.User, error) {
	return s.CreateFromProvider("google", &models.ProviderUserInfo{
		ProviderID:    googleInfo.ID,
		Email:         googleInfo.Email,
		EmailVerified: googleInfo.VerifiedEmail,
		Picture:       googleInfo.Picture,
	})
}

// CreateFromApple creates a new user from Apple info
func (s *UserService) CreateFromApple(appleInfo *models.AppleUserInfo) (*models.User, error) {
	return s.CreateFromProvider("apple", &models.ProviderUserInfo{
		ProviderID:    appleInfo.Sub,
		Email:         appleInfo.Email,
		EmailVerified: appleInfo.EmailVerified,
	})
}

// CreateFromFacebook creates a new user from Facebook info
func (s *UserService) CreateFromFacebook(fbInfo *models.FacebookUserInfo) (*models.User, error) {
	return s.CreateFromProvider("facebook", &models.ProviderUserInfo{
		ProviderID:    fbInfo.ID,
		Email:         fbInfo.Email,
		EmailVerified: true,
		Picture:       fbInfo.Picture,
	})
}

// CreateFromTwitter creates a new user from Twitter info
func (s *UserService) CreateFromTwitter(twitterInfo *models.TwitterUserInfo) (*models.User, error) {
	return s.CreateFromProvider("twitter", &models.ProviderUserInfo{
		ProviderID: twitterInfo.ID,
		Email:      twitterInfo.Username + "@twitter.placeholder",
		Picture:    twitterInfo.ProfileImageURL,
	})
}

// --- Non-provider-specific methods ---

// FindByEmail finds a user by email
func (s *UserService) FindByEmail(email string) (*models.User, error) {
	query := fmt.Sprintf("SELECT %s FROM users WHERE email = $1", userColumns)
	return scanUser(s.db.QueryRow(query, email))
}

// FindByGenID finds a user by gen_id
func (s *UserService) FindByGenID(genID string) (*models.User, error) {
	query := fmt.Sprintf("SELECT %s FROM users WHERE gen_id = $1", userColumns)
	user, err := scanUser(s.db.QueryRow(query, genID))
	if err != nil {
		return nil, err
	}
	s.loadCitizen(user)
	return user, nil
}

// UpdateLastLogin updates the user's last login timestamp
func (s *UserService) UpdateLastLogin(userID int64) error {
	_, err := s.db.Exec(`
		UPDATE users SET last_login_at = $1 WHERE id = $2
	`, time.Now(), userID)
	return err
}

// UpdatePicture updates the user's profile picture URL
func (s *UserService) UpdatePicture(userID int64, picture string) error {
	_, err := s.db.Exec(`
		UPDATE users SET picture = $1 WHERE id = $2
	`, picture, userID)
	return err
}

// latinToCyrillic converts Latin letters to their Cyrillic equivalents
func latinToCyrillic(s string) string {
	replacer := strings.NewReplacer(
		"A", "А", "a", "а",
		"B", "В", "b", "в",
		"C", "С", "c", "с",
		"E", "Е", "e", "е",
		"H", "Н", "h", "н",
		"K", "К", "k", "к",
		"M", "М", "m", "м",
		"O", "О", "o", "о",
		"P", "Р", "p", "р",
		"T", "Т", "t", "т",
		"X", "Х", "x", "х",
		"Y", "У", "y", "у",
	)
	return replacer.Replace(s)
}

// LinkCitizen links a user to a citizen record by reg_no.
// Uses a transaction with row-level locking to ensure atomic
// citizen lookup, optional gen_id generation, and user update.
func (s *UserService) LinkCitizen(userID int64, regNo string) error {
	normalizedRegNo := strings.ToUpper(latinToCyrillic(regNo))

	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Step 1: Lock and fetch the citizen row
	var citizenID int64
	err = tx.QueryRow(
		`SELECT id FROM citizens WHERE UPPER(reg_no) = $1 FOR UPDATE`,
		normalizedRegNo,
	).Scan(&citizenID)

	if err == sql.ErrNoRows {
		return fmt.Errorf("citizen not found for reg_no: %s", normalizedRegNo)
	} else if err != nil {
		return fmt.Errorf("failed to find citizen: %w", err)
	}

	// Step 2: Lock the user row and check for existing gen_id
	var currentGenID sql.NullString
	err = tx.QueryRow(
		`SELECT gen_id FROM users WHERE id = $1 FOR UPDATE`,
		userID,
	).Scan(&currentGenID)
	if err == sql.ErrNoRows {
		return fmt.Errorf("user not found with id: %d", userID)
	}
	if err != nil {
		return fmt.Errorf("failed to lock user row: %w", err)
	}

	// Step 3: Generate gen_id if user doesn't have one
	genID := currentGenID.String
	if !currentGenID.Valid || currentGenID.String == "" {
		genID, err = s.genIDService.GenerateWithTx(tx)
		if err != nil {
			return fmt.Errorf("failed to generate gen_id: %w", err)
		}
	}

	// Step 4: Atomic update — citizen_id, gen_id, verified
	_, err = tx.Exec(
		`UPDATE users SET citizen_id = $1, gen_id = $2, verified = true WHERE id = $3`,
		citizenID, genID, userID,
	)
	if err != nil {
		return fmt.Errorf("failed to link citizen: %w", err)
	}

	return tx.Commit()
}

// FindCitizenByID finds a citizen by ID
func (s *UserService) FindCitizenByID(id int64) (*models.Citizen, error) {
	citizen := &models.Citizen{}
	err := s.db.QueryRow(`
		SELECT id, civil_id, reg_no, family_name, last_name, first_name, sex, birth_date,
		       phone_primary, email, current_province, current_district
		FROM citizens WHERE id = $1
	`, id).Scan(
		&citizen.ID, &citizen.CivilID, &citizen.RegNo, &citizen.FamilyName, &citizen.LastName,
		&citizen.FirstName, &citizen.Gender, &citizen.BirthDate,
		&citizen.PhoneNo, &citizen.Email, &citizen.AimagName, &citizen.SumName,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find citizen: %w", err)
	}

	return citizen, nil
}

// FindCitizenByRegNo finds a citizen by registration number (case-insensitive, Latin-to-Cyrillic aware)
func (s *UserService) FindCitizenByRegNo(regNo string) (*models.Citizen, error) {
	normalizedRegNo := strings.ToUpper(latinToCyrillic(regNo))
	citizen := &models.Citizen{}
	err := s.db.QueryRow(`
		SELECT id, civil_id, reg_no, family_name, last_name, first_name, sex, birth_date,
		       phone_primary, email, current_province, current_district
		FROM citizens WHERE UPPER(reg_no) = $1
	`, normalizedRegNo).Scan(
		&citizen.ID, &citizen.CivilID, &citizen.RegNo, &citizen.FamilyName, &citizen.LastName,
		&citizen.FirstName, &citizen.Gender, &citizen.BirthDate,
		&citizen.PhoneNo, &citizen.Email, &citizen.AimagName, &citizen.SumName,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find citizen: %w", err)
	}

	return citizen, nil
}

// LogAudit logs an audit event
func (s *UserService) LogAudit(userID int64, action string, details map[string]interface{}, ipAddress string) error {
	detailsJSON, _ := json.Marshal(details)
	_, err := s.db.Exec(`
		INSERT INTO audit_logs (user_id, action, details, ip_address)
		VALUES ($1, $2, $3, $4)
	`, userID, action, detailsJSON, ipAddress)
	return err
}

// LogDanVerification logs a DAN verification event
func (s *UserService) LogDanVerification(userID int64, regNo string, method string) error {
	_, err := s.db.Exec(`
		INSERT INTO dan_verification_logs (user_id, reg_no, method)
		VALUES ($1, $2, $3)
	`, userID, regNo, method)
	return err
}

// GetDanVerificationLogs retrieves the last 10 verification logs for a user
func (s *UserService) GetDanVerificationLogs(userID int64) ([]models.DanVerificationLog, error) {
	rows, err := s.db.Query(`
		SELECT id, user_id, reg_no, method, created_at
		FROM dan_verification_logs
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT 10
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query logs: %w", err)
	}
	defer rows.Close()

	var logs []models.DanVerificationLog
	for rows.Next() {
		var l models.DanVerificationLog
		if err := rows.Scan(&l.ID, &l.UserID, &l.RegNo, &l.Method, &l.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan log: %w", err)
		}
		logs = append(logs, l)
	}
	return logs, nil
}
