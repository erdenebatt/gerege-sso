package services

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
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
const userColumns = `id, gen_id, google_sub, apple_sub, facebook_id, twitter_id, email, email_verified, picture, citizen_id, verified, verification_level, mfa_enabled, mfa_level, org_id, role, created_at, updated_at, last_login_at`

// UserService handles user-related operations
type UserService struct {
	db               *sql.DB
	genIDService     *GenIDService
	geregeCoreService *GeregeCoreService
}

// NewUserService creates a new UserService
func NewUserService(db *sql.DB, genIDService *GenIDService, geregeCoreService *GeregeCoreService) *UserService {
	return &UserService{
		db:               db,
		genIDService:     genIDService,
		geregeCoreService: geregeCoreService,
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
		&user.Picture, &user.CitizenID, &user.Verified, &user.VerificationLevel,
		&user.MFAEnabled, &user.MFALevel, &user.OrgID, &user.Role,
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
		INSERT INTO users (gen_id, %s, email, email_verified, picture, verified, verification_level, role)
		VALUES ($1, $2, $3, $4, $5, false, 1, 'CITIZEN')
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

// FindByID finds a user by ID
func (s *UserService) FindByID(id int64) (*models.User, error) {
	query := fmt.Sprintf("SELECT %s FROM users WHERE id = $1", userColumns)
	user, err := scanUser(s.db.QueryRow(query, id))
	if err != nil {
		return nil, err
	}
	s.loadCitizen(user)
	return user, nil
}

// FindByEmail finds a user by email
func (s *UserService) FindByEmail(email string) (*models.User, error) {
	query := fmt.Sprintf("SELECT %s FROM users WHERE email = $1", userColumns)
	return scanUser(s.db.QueryRow(query, email))
}

// FindOrCreateByEmail finds a user by email, or creates a new one if not found.
// Used for passwordless email OTP login.
func (s *UserService) FindOrCreateByEmail(email string) (*models.User, error) {
	user, err := s.FindByEmail(email)
	if err != nil {
		return nil, err
	}
	if user != nil {
		return user, nil
	}

	// Create new user with email
	genID, err := s.genIDService.Generate()
	if err != nil {
		return nil, fmt.Errorf("failed to generate gen_id: %w", err)
	}

	query := fmt.Sprintf(`
		INSERT INTO users (gen_id, email, email_verified, verified, verification_level, role)
		VALUES ($1, $2, true, false, 1, 'CITIZEN')
		RETURNING %s
	`, userColumns)

	user, err = scanUser(s.db.QueryRow(query, genID, email))
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}
	return user, nil
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

// UpdateVerificationLevel updates a user's verification level (only increases, never decreases)
func (s *UserService) UpdateVerificationLevel(userID int64, level int) error {
	_, err := s.db.Exec(
		`UPDATE users SET verification_level = $1 WHERE id = $2 AND verification_level < $1`,
		level, userID,
	)
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
// If the citizen is not found locally, it fetches from Gerege Core API and inserts.
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
		// Not found locally — try Gerege Core API
		if s.geregeCoreService == nil {
			return fmt.Errorf("citizen not found for reg_no: %s", normalizedRegNo)
		}

		coreResp, coreErr := s.geregeCoreService.FindCitizen(normalizedRegNo)
		if coreErr != nil {
			return fmt.Errorf("failed to fetch citizen from core API: %w", coreErr)
		}
		if coreResp == nil {
			return fmt.Errorf("citizen not found for reg_no: %s", normalizedRegNo)
		}

		// Insert citizen from Core API response
		inserted, insertErr := s.insertCitizenFromCore(tx, coreResp)
		if insertErr != nil {
			return fmt.Errorf("failed to insert citizen from core API: %w", insertErr)
		}
		citizenID = inserted.ID
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

// insertCitizenFromCore inserts a citizen record from Core API response within a transaction.
func (s *UserService) insertCitizenFromCore(tx *sql.Tx, resp *CoreCitizenResponse) (*models.Citizen, error) {
	// Convert gender int to BIGINT for the gender column
	var gender int64
	if resp.Gender == 1 {
		gender = 1
	} else if resp.Gender == 2 {
		gender = 2
	}

	// Extract date part from birth_date (e.g. "1994-06-26T00:00:00Z" → "1994-06-26")
	birthDate := resp.BirthDate
	if len(birthDate) >= 10 {
		birthDate = birthDate[:10]
	}

	var citizenID int64
	err := tx.QueryRow(`
		INSERT INTO citizens (
			gerege_id, civil_id, reg_no, family_name, last_name, first_name,
			gender, birth_date, phone_no, email,
			nationality, aimag_name, sum_name,
			residential_parent_address_id, residential_parent_address_name,
			residential_aimag_id, residential_aimag_code, residential_aimag_name,
			residential_sum_id, residential_sum_code, residential_sum_name,
			residential_bag_id, residential_bag_code, residential_bag_name,
			residential_address_detail,
			ebarimt_tin
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10,
			$11, $12, $13,
			$14, $15,
			$16, $17, $18,
			$19, $20, $21,
			$22, $23, $24,
			$25,
			$26
		)
		RETURNING id
	`,
		resp.ID, fmt.Sprintf("%d", resp.CivilID), resp.RegNo, resp.FamilyName, resp.LastName, resp.FirstName,
		gender, birthDate, resp.PhoneNo, resp.Email,
		resp.Nationality, resp.AimagName, resp.SumName,
		resp.ResidentialParentAddressID, resp.ResidentialParentAddressName,
		resp.ResidentialAimagID, resp.ResidentialAimagCode, resp.ResidentialAimagName,
		resp.ResidentialSumID, resp.ResidentialSumCode, resp.ResidentialSumName,
		resp.ResidentialBagID, resp.ResidentialBagCode, resp.ResidentialBagName,
		resp.ResidentialAddressDetail,
		resp.EbarimtTIN,
	).Scan(&citizenID)

	if err != nil {
		return nil, fmt.Errorf("failed to insert citizen: %w", err)
	}

	return &models.Citizen{ID: citizenID}, nil
}

// updateCitizenFromCore updates an existing citizen record with the latest data from Core API.
// DAN data is considered the authoritative source.
func (s *UserService) updateCitizenFromCore(tx *sql.Tx, citizenID int64, resp *CoreCitizenResponse) error {
	var gender int64
	if resp.Gender == 1 {
		gender = 1
	} else if resp.Gender == 2 {
		gender = 2
	}

	birthDate := resp.BirthDate
	if len(birthDate) >= 10 {
		birthDate = birthDate[:10]
	}

	_, err := tx.Exec(`
		UPDATE citizens SET
			gerege_id = COALESCE(NULLIF($1, 0), gerege_id),
			civil_id = $2, family_name = $3, last_name = $4, first_name = $5,
			gender = $6, birth_date = $7, phone_no = $8, email = $9,
			nationality = $10, aimag_name = $11, sum_name = $12,
			parent_address_id = $13, parent_address_name = $14,
			aimag_id = $15, aimag_code = $16,
			sum_id = $17, sum_code = $18,
			bag_id = $19, bag_code = $20, bag_name = $21,
			address_detail = $22,
			residential_parent_address_id = $23, residential_parent_address_name = $24,
			residential_aimag_id = $25, residential_aimag_code = $26, residential_aimag_name = $27,
			residential_sum_id = $28, residential_sum_code = $29, residential_sum_name = $30,
			residential_bag_id = $31, residential_bag_code = $32, residential_bag_name = $33,
			residential_address_detail = $34,
			ebarimt_tin = $35
		WHERE id = $36
	`,
		resp.ID, fmt.Sprintf("%d", resp.CivilID), resp.FamilyName, resp.LastName, resp.FirstName,
		gender, birthDate, resp.PhoneNo, resp.Email,
		resp.Nationality, resp.AimagName, resp.SumName,
		resp.ParentAddressID, resp.ParentAddressName,
		resp.AimagID, resp.AimagCode,
		resp.SumID, resp.SumCode,
		resp.BagID, resp.BagCode, resp.BagName,
		resp.AddressDetail,
		resp.ResidentialParentAddressID, resp.ResidentialParentAddressName,
		resp.ResidentialAimagID, resp.ResidentialAimagCode, resp.ResidentialAimagName,
		resp.ResidentialSumID, resp.ResidentialSumCode, resp.ResidentialSumName,
		resp.ResidentialBagID, resp.ResidentialBagCode, resp.ResidentialBagName,
		resp.ResidentialAddressDetail,
		resp.EbarimtTIN,
		citizenID,
	)
	return err
}

// UpdateCitizenFromDAN updates citizen record with data from DAN SSO.
// DAN is the authoritative source — all non-empty fields are updated.
func (s *UserService) UpdateCitizenFromDAN(regNo string, data map[string]string) error {
	normalizedRegNo := strings.ToUpper(latinToCyrillic(regNo))

	// Build dynamic UPDATE query with only non-empty fields
	setClauses := []string{}
	args := []interface{}{}
	argIdx := 1

	// Map of DAN param names to DB column names
	fieldMap := map[string]string{
		"surname":                        "last_name",
		"given_name":                     "first_name",
		"family_name":                    "family_name",
		"civil_id":                       "civil_id",
		"gender":                         "gender",
		"birth_date":                     "birth_date",
		"phone_no":                       "phone_no",
		"email":                          "email",
		"nationality":                    "nationality",
		"aimag_name":                     "aimag_name",
		"sum_name":                       "sum_name",
		"bag_name":                       "bag_name",
		"address_detail":                 "address_detail",
		"aimag_id":                       "aimag_id",
		"aimag_code":                     "aimag_code",
		"sum_id":                         "sum_id",
		"sum_code":                       "sum_code",
		"bag_id":                         "bag_id",
		"bag_code":                       "bag_code",
		"parent_address_id":              "parent_address_id",
		"parent_address_name":            "parent_address_name",
		"residential_aimag_name":         "residential_aimag_name",
		"residential_sum_name":           "residential_sum_name",
		"residential_bag_name":           "residential_bag_name",
		"residential_address_detail":     "residential_address_detail",
		"residential_aimag_id":           "residential_aimag_id",
		"residential_aimag_code":         "residential_aimag_code",
		"residential_sum_id":             "residential_sum_id",
		"residential_sum_code":           "residential_sum_code",
		"residential_bag_id":             "residential_bag_id",
		"residential_bag_code":           "residential_bag_code",
		"residential_parent_address_id":  "residential_parent_address_id",
		"residential_parent_address_name": "residential_parent_address_name",
	}

	for danKey, dbCol := range fieldMap {
		val := data[danKey]
		if val == "" {
			continue
		}
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", dbCol, argIdx))
		args = append(args, val)
		argIdx++
	}

	if len(setClauses) == 0 {
		log.Printf("DAN update: no fields to update for reg_no=%s", normalizedRegNo)
		return nil
	}

	query := fmt.Sprintf("UPDATE citizens SET %s WHERE UPPER(reg_no) = $%d",
		strings.Join(setClauses, ", "), argIdx)
	args = append(args, normalizedRegNo)

	result, err := s.db.Exec(query, args...)
	if err != nil {
		return fmt.Errorf("failed to update citizen from DAN: %w", err)
	}

	rows, _ := result.RowsAffected()
	log.Printf("DAN update: updated %d citizen row(s) for reg_no=%s with %d fields", rows, normalizedRegNo, len(setClauses))
	return nil
}

// RefreshCitizenFromCore fetches latest citizen data from Core API and updates the citizen table.
// Called after DAN verification to ensure citizen data is up to date.
func (s *UserService) RefreshCitizenFromCore(regNo string) error {
	if s.geregeCoreService == nil {
		return nil
	}

	normalizedRegNo := strings.ToUpper(latinToCyrillic(regNo))

	coreResp, err := s.geregeCoreService.FindCitizen(normalizedRegNo)
	if err != nil {
		return fmt.Errorf("core API fetch failed: %w", err)
	}
	if coreResp == nil {
		return nil
	}

	var gender int64
	if coreResp.Gender == 1 {
		gender = 1
	} else if coreResp.Gender == 2 {
		gender = 2
	}

	birthDate := coreResp.BirthDate
	if len(birthDate) >= 10 {
		birthDate = birthDate[:10]
	}

	_, err = s.db.Exec(`
		UPDATE citizens SET
			gerege_id = COALESCE(NULLIF($1, 0), gerege_id),
			civil_id = $2, family_name = $3, last_name = $4, first_name = $5,
			gender = $6, birth_date = $7, phone_no = $8, email = $9,
			nationality = $10, aimag_name = $11, sum_name = $12,
			parent_address_id = $13, parent_address_name = $14,
			aimag_id = $15, aimag_code = $16,
			sum_id = $17, sum_code = $18,
			bag_id = $19, bag_code = $20, bag_name = $21,
			address_detail = $22,
			residential_parent_address_id = $23, residential_parent_address_name = $24,
			residential_aimag_id = $25, residential_aimag_code = $26, residential_aimag_name = $27,
			residential_sum_id = $28, residential_sum_code = $29, residential_sum_name = $30,
			residential_bag_id = $31, residential_bag_code = $32, residential_bag_name = $33,
			residential_address_detail = $34,
			ebarimt_tin = $35
		WHERE UPPER(reg_no) = $36
	`,
		coreResp.ID, fmt.Sprintf("%d", coreResp.CivilID), coreResp.FamilyName, coreResp.LastName, coreResp.FirstName,
		gender, birthDate, coreResp.PhoneNo, coreResp.Email,
		coreResp.Nationality, coreResp.AimagName, coreResp.SumName,
		coreResp.ParentAddressID, coreResp.ParentAddressName,
		coreResp.AimagID, coreResp.AimagCode,
		coreResp.SumID, coreResp.SumCode,
		coreResp.BagID, coreResp.BagCode, coreResp.BagName,
		coreResp.AddressDetail,
		coreResp.ResidentialParentAddressID, coreResp.ResidentialParentAddressName,
		coreResp.ResidentialAimagID, coreResp.ResidentialAimagCode, coreResp.ResidentialAimagName,
		coreResp.ResidentialSumID, coreResp.ResidentialSumCode, coreResp.ResidentialSumName,
		coreResp.ResidentialBagID, coreResp.ResidentialBagCode, coreResp.ResidentialBagName,
		coreResp.ResidentialAddressDetail,
		coreResp.EbarimtTIN,
		normalizedRegNo,
	)
	if err != nil {
		return fmt.Errorf("failed to update citizen: %w", err)
	}

	log.Printf("Refreshed citizen data from Core API for reg_no=%s", normalizedRegNo)
	return nil
}

// citizenColumns is the standard set of columns selected for citizen queries
const citizenColumns = `id, civil_id, reg_no, family_name, last_name, first_name, gender, birth_date,
	phone_no, email, aimag_name, sum_name,
	residential_parent_address_id, residential_parent_address_name,
	residential_aimag_id, residential_aimag_code, residential_aimag_name,
	residential_sum_id, residential_sum_code, residential_sum_name,
	residential_bag_id, residential_bag_code, residential_bag_name,
	residential_address_detail, ebarimt_tin`

// scanCitizen scans a citizen row into a Citizen struct
func scanCitizen(row scannable) (*models.Citizen, error) {
	citizen := &models.Citizen{}
	err := row.Scan(
		&citizen.ID, &citizen.CivilID, &citizen.RegNo, &citizen.FamilyName, &citizen.LastName,
		&citizen.FirstName, &citizen.Gender, &citizen.BirthDate,
		&citizen.PhoneNo, &citizen.Email, &citizen.AimagName, &citizen.SumName,
		&citizen.ResidentialParentAddressID, &citizen.ResidentialParentAddressName,
		&citizen.ResidentialAimagID, &citizen.ResidentialAimagCode, &citizen.ResidentialAimagName,
		&citizen.ResidentialSumID, &citizen.ResidentialSumCode, &citizen.ResidentialSumName,
		&citizen.ResidentialBagID, &citizen.ResidentialBagCode, &citizen.ResidentialBagName,
		&citizen.ResidentialAddressDetail, &citizen.EbarimtTIN,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan citizen: %w", err)
	}
	return citizen, nil
}

// FindCitizenByID finds a citizen by ID
func (s *UserService) FindCitizenByID(id int64) (*models.Citizen, error) {
	query := fmt.Sprintf("SELECT %s FROM citizens WHERE id = $1", citizenColumns)
	return scanCitizen(s.db.QueryRow(query, id))
}

// FindCitizenByRegNo finds a citizen by registration number (case-insensitive, Latin-to-Cyrillic aware)
func (s *UserService) FindCitizenByRegNo(regNo string) (*models.Citizen, error) {
	normalizedRegNo := strings.ToUpper(latinToCyrillic(regNo))
	query := fmt.Sprintf("SELECT %s FROM citizens WHERE UPPER(reg_no) = $1", citizenColumns)
	return scanCitizen(s.db.QueryRow(query, normalizedRegNo))
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

// LogDanVerification logs a DAN SSO verification event
func (s *UserService) LogDanVerification(userID int64, regNo string, method string) error {
	_, err := s.db.Exec(`
		INSERT INTO dan_verification_logs (user_id, reg_no, method)
		VALUES ($1, $2, $3)
	`, userID, regNo, method)
	return err
}

// GetDanVerificationLogs retrieves the last 10 DAN verification logs for a user
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

// LogRegistryVerification logs a reg_no verification event
func (s *UserService) LogRegistryVerification(userID int64, regNo string) error {
	_, err := s.db.Exec(`
		INSERT INTO registry_verify_logs (user_id, reg_no)
		VALUES ($1, $2)
	`, userID, regNo)
	return err
}

// GetRegistryVerifyLogs retrieves the last 10 registry verification logs for a user
func (s *UserService) GetRegistryVerifyLogs(userID int64) ([]models.RegistryVerifyLog, error) {
	rows, err := s.db.Query(`
		SELECT id, user_id, reg_no, created_at
		FROM registry_verify_logs
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT 10
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query registry logs: %w", err)
	}
	defer rows.Close()

	var logs []models.RegistryVerifyLog
	for rows.Next() {
		var l models.RegistryVerifyLog
		if err := rows.Scan(&l.ID, &l.UserID, &l.RegNo, &l.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan registry log: %w", err)
		}
		logs = append(logs, l)
	}
	return logs, nil
}
