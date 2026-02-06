package services

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"gerege-sso/models"
)

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

// FindByGoogleSub finds a user by their Google sub (ID)
func (s *UserService) FindByGoogleSub(googleSub string) (*models.User, error) {
	user := &models.User{}
	err := s.db.QueryRow(`
		SELECT id, gen_id, google_sub, apple_sub, facebook_id, twitter_id, email, email_verified, picture, citizen_id, verified, created_at, updated_at, last_login_at
		FROM users WHERE google_sub = $1
	`, googleSub).Scan(
		&user.ID, &user.GenID, &user.GoogleSub, &user.AppleSub, &user.FacebookID, &user.TwitterID, &user.Email, &user.EmailVerified,
		&user.Picture, &user.CitizenID, &user.Verified, &user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	// Load citizen data if exists
	if user.CitizenID.Valid {
		citizen, err := s.FindCitizenByID(user.CitizenID.Int64)
		if err == nil {
			user.Citizen = citizen
		}
	}

	return user, nil
}

// FindByAppleSub finds a user by their Apple sub (ID)
func (s *UserService) FindByAppleSub(appleSub string) (*models.User, error) {
	user := &models.User{}
	err := s.db.QueryRow(`
		SELECT id, gen_id, google_sub, apple_sub, facebook_id, twitter_id, email, email_verified, picture, citizen_id, verified, created_at, updated_at, last_login_at
		FROM users WHERE apple_sub = $1
	`, appleSub).Scan(
		&user.ID, &user.GenID, &user.GoogleSub, &user.AppleSub, &user.FacebookID, &user.TwitterID, &user.Email, &user.EmailVerified,
		&user.Picture, &user.CitizenID, &user.Verified, &user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	// Load citizen data if exists
	if user.CitizenID.Valid {
		citizen, err := s.FindCitizenByID(user.CitizenID.Int64)
		if err == nil {
			user.Citizen = citizen
		}
	}

	return user, nil
}

// FindByEmail finds a user by email
func (s *UserService) FindByEmail(email string) (*models.User, error) {
	user := &models.User{}
	err := s.db.QueryRow(`
		SELECT id, gen_id, google_sub, apple_sub, facebook_id, twitter_id, email, email_verified, picture, citizen_id, verified, created_at, updated_at, last_login_at
		FROM users WHERE email = $1
	`, email).Scan(
		&user.ID, &user.GenID, &user.GoogleSub, &user.AppleSub, &user.FacebookID, &user.TwitterID, &user.Email, &user.EmailVerified,
		&user.Picture, &user.CitizenID, &user.Verified, &user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	return user, nil
}

// FindByGenID finds a user by gen_id
func (s *UserService) FindByGenID(genID string) (*models.User, error) {
	user := &models.User{}
	err := s.db.QueryRow(`
		SELECT id, gen_id, google_sub, apple_sub, facebook_id, twitter_id, email, email_verified, picture, citizen_id, verified, created_at, updated_at, last_login_at
		FROM users WHERE gen_id = $1
	`, genID).Scan(
		&user.ID, &user.GenID, &user.GoogleSub, &user.AppleSub, &user.FacebookID, &user.TwitterID, &user.Email, &user.EmailVerified,
		&user.Picture, &user.CitizenID, &user.Verified, &user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	// Load citizen data if exists
	if user.CitizenID.Valid {
		citizen, err := s.FindCitizenByID(user.CitizenID.Int64)
		if err == nil {
			user.Citizen = citizen
		}
	}

	return user, nil
}

// Create creates a new user from Google info
func (s *UserService) Create(googleInfo *models.GoogleUserInfo) (*models.User, error) {
	// Generate unique 11-digit gen_id
	genID, err := s.genIDService.Generate()
	if err != nil {
		return nil, fmt.Errorf("failed to generate gen_id: %w", err)
	}

	user := &models.User{}
	err = s.db.QueryRow(`
		INSERT INTO users (gen_id, google_sub, email, email_verified, picture, verified)
		VALUES ($1, $2, $3, $4, $5, false)
		RETURNING id, gen_id, google_sub, apple_sub, facebook_id, twitter_id, email, email_verified, picture, citizen_id, verified, created_at, updated_at, last_login_at
	`, genID, googleInfo.ID, googleInfo.Email, googleInfo.VerifiedEmail, googleInfo.Picture).Scan(
		&user.ID, &user.GenID, &user.GoogleSub, &user.AppleSub, &user.FacebookID, &user.TwitterID, &user.Email, &user.EmailVerified,
		&user.Picture, &user.CitizenID, &user.Verified, &user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// CreateFromApple creates a new user from Apple info
func (s *UserService) CreateFromApple(appleInfo *models.AppleUserInfo) (*models.User, error) {
	// Generate unique 11-digit gen_id
	genID, err := s.genIDService.Generate()
	if err != nil {
		return nil, fmt.Errorf("failed to generate gen_id: %w", err)
	}

	user := &models.User{}
	err = s.db.QueryRow(`
		INSERT INTO users (gen_id, apple_sub, email, email_verified, verified)
		VALUES ($1, $2, $3, $4, false)
		RETURNING id, gen_id, google_sub, apple_sub, facebook_id, twitter_id, email, email_verified, picture, citizen_id, verified, created_at, updated_at, last_login_at
	`, genID, appleInfo.Sub, appleInfo.Email, appleInfo.EmailVerified).Scan(
		&user.ID, &user.GenID, &user.GoogleSub, &user.AppleSub, &user.FacebookID, &user.TwitterID, &user.Email, &user.EmailVerified,
		&user.Picture, &user.CitizenID, &user.Verified, &user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// LinkAppleSub links an Apple account to an existing user
func (s *UserService) LinkAppleSub(userID int64, appleSub string) error {
	_, err := s.db.Exec(`
		UPDATE users SET apple_sub = $1 WHERE id = $2
	`, appleSub, userID)
	return err
}

// LinkGoogleSub links a Google account to an existing user
func (s *UserService) LinkGoogleSub(userID int64, googleSub string) error {
	_, err := s.db.Exec(`
		UPDATE users SET google_sub = $1 WHERE id = $2
	`, googleSub, userID)
	return err
}

// FindByFacebookID finds a user by their Facebook ID
func (s *UserService) FindByFacebookID(facebookID string) (*models.User, error) {
	user := &models.User{}
	err := s.db.QueryRow(`
		SELECT id, gen_id, google_sub, apple_sub, facebook_id, twitter_id, email, email_verified, picture, citizen_id, verified, created_at, updated_at, last_login_at
		FROM users WHERE facebook_id = $1
	`, facebookID).Scan(
		&user.ID, &user.GenID, &user.GoogleSub, &user.AppleSub, &user.FacebookID, &user.TwitterID, &user.Email, &user.EmailVerified,
		&user.Picture, &user.CitizenID, &user.Verified, &user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	// Load citizen data if exists
	if user.CitizenID.Valid {
		citizen, err := s.FindCitizenByID(user.CitizenID.Int64)
		if err == nil {
			user.Citizen = citizen
		}
	}

	return user, nil
}

// CreateFromFacebook creates a new user from Facebook info
func (s *UserService) CreateFromFacebook(fbInfo *models.FacebookUserInfo) (*models.User, error) {
	// Generate unique 11-digit gen_id
	genID, err := s.genIDService.Generate()
	if err != nil {
		return nil, fmt.Errorf("failed to generate gen_id: %w", err)
	}

	user := &models.User{}
	err = s.db.QueryRow(`
		INSERT INTO users (gen_id, facebook_id, email, email_verified, picture, verified)
		VALUES ($1, $2, $3, true, $4, false)
		RETURNING id, gen_id, google_sub, apple_sub, facebook_id, twitter_id, email, email_verified, picture, citizen_id, verified, created_at, updated_at, last_login_at
	`, genID, fbInfo.ID, fbInfo.Email, fbInfo.Picture).Scan(
		&user.ID, &user.GenID, &user.GoogleSub, &user.AppleSub, &user.FacebookID, &user.TwitterID, &user.Email, &user.EmailVerified,
		&user.Picture, &user.CitizenID, &user.Verified, &user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// LinkFacebookID links a Facebook account to an existing user
func (s *UserService) LinkFacebookID(userID int64, facebookID string) error {
	_, err := s.db.Exec(`
		UPDATE users SET facebook_id = $1 WHERE id = $2
	`, facebookID, userID)
	return err
}

// FindByTwitterID finds a user by their Twitter ID
func (s *UserService) FindByTwitterID(twitterID string) (*models.User, error) {
	user := &models.User{}
	err := s.db.QueryRow(`
		SELECT id, gen_id, google_sub, apple_sub, facebook_id, twitter_id, email, email_verified, picture, citizen_id, verified, created_at, updated_at, last_login_at
		FROM users WHERE twitter_id = $1
	`, twitterID).Scan(
		&user.ID, &user.GenID, &user.GoogleSub, &user.AppleSub, &user.FacebookID, &user.TwitterID, &user.Email, &user.EmailVerified,
		&user.Picture, &user.CitizenID, &user.Verified, &user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	// Load citizen data if exists
	if user.CitizenID.Valid {
		citizen, err := s.FindCitizenByID(user.CitizenID.Int64)
		if err == nil {
			user.Citizen = citizen
		}
	}

	return user, nil
}

// CreateFromTwitter creates a new user from Twitter info
func (s *UserService) CreateFromTwitter(twitterInfo *models.TwitterUserInfo) (*models.User, error) {
	// Generate unique 11-digit gen_id
	genID, err := s.genIDService.Generate()
	if err != nil {
		return nil, fmt.Errorf("failed to generate gen_id: %w", err)
	}

	user := &models.User{}
	// Twitter doesn't provide email by default, so we use username@twitter as placeholder
	placeholderEmail := twitterInfo.Username + "@twitter.placeholder"
	err = s.db.QueryRow(`
		INSERT INTO users (gen_id, twitter_id, email, email_verified, picture, verified)
		VALUES ($1, $2, $3, false, $4, false)
		RETURNING id, gen_id, google_sub, apple_sub, facebook_id, twitter_id, email, email_verified, picture, citizen_id, verified, created_at, updated_at, last_login_at
	`, genID, twitterInfo.ID, placeholderEmail, twitterInfo.ProfileImageURL).Scan(
		&user.ID, &user.GenID, &user.GoogleSub, &user.AppleSub, &user.FacebookID, &user.TwitterID, &user.Email, &user.EmailVerified,
		&user.Picture, &user.CitizenID, &user.Verified, &user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// LinkTwitterID links a Twitter account to an existing user
func (s *UserService) LinkTwitterID(userID int64, twitterID string) error {
	_, err := s.db.Exec(`
		UPDATE users SET twitter_id = $1 WHERE id = $2
	`, twitterID, userID)
	return err
}

// UpdateLastLogin updates the user's last login timestamp
func (s *UserService) UpdateLastLogin(userID int64) error {
	_, err := s.db.Exec(`
		UPDATE users SET last_login_at = $1 WHERE id = $2
	`, time.Now(), userID)
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
		return fmt.Errorf("citizen not found with reg_no: %s", regNo)
	}
	if err != nil {
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
		SELECT id, civil_id, reg_no, family_name, last_name, first_name, gender, birth_date,
		       phone_no, email, aimag_name, sum_name
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

// FindCitizenByRegNo finds a citizen by registration number
func (s *UserService) FindCitizenByRegNo(regNo string) (*models.Citizen, error) {
	citizen := &models.Citizen{}
	err := s.db.QueryRow(`
		SELECT id, civil_id, reg_no, family_name, last_name, first_name, gender, birth_date,
		       phone_no, email, aimag_name, sum_name
		FROM citizens WHERE reg_no = $1
	`, regNo).Scan(
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
