package mocks

import (
	"fmt"
	"sync"

	"gerege-sso/models"
)

// MockUserRepository is a mock implementation of UserRepository for testing
type MockUserRepository struct {
	mu    sync.RWMutex
	users map[string]*models.User // keyed by gen_id
}

func NewMockUserRepository() *MockUserRepository {
	return &MockUserRepository{
		users: make(map[string]*models.User),
	}
}

func (m *MockUserRepository) FindByProviderID(provider, providerID string) (*models.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, u := range m.users {
		switch provider {
		case "google":
			if u.GoogleSub.Valid && u.GoogleSub.String == providerID {
				return u, nil
			}
		case "apple":
			if u.AppleSub.Valid && u.AppleSub.String == providerID {
				return u, nil
			}
		case "facebook":
			if u.FacebookID.Valid && u.FacebookID.String == providerID {
				return u, nil
			}
		case "twitter":
			if u.TwitterID.Valid && u.TwitterID.String == providerID {
				return u, nil
			}
		}
	}
	return nil, nil
}

func (m *MockUserRepository) FindByEmail(email string) (*models.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, u := range m.users {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, nil
}

func (m *MockUserRepository) FindByGenID(genID string) (*models.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if u, ok := m.users[genID]; ok {
		return u, nil
	}
	return nil, nil
}

func (m *MockUserRepository) CreateFromProvider(provider string, info *models.ProviderUserInfo, genID string) (*models.User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	user := &models.User{
		ID:    int64(len(m.users) + 1),
		GenID: genID,
		Email: info.Email,
	}
	m.users[genID] = user
	return user, nil
}

func (m *MockUserRepository) LinkProviderID(userID int64, provider, providerID string) error {
	return nil
}

func (m *MockUserRepository) UpdateLastLogin(userID int64) error {
	return nil
}

func (m *MockUserRepository) LinkCitizen(userID int64, regNo string) error {
	return nil
}

func (m *MockUserRepository) FindCitizenByID(id int64) (*models.Citizen, error) {
	return nil, nil
}

func (m *MockUserRepository) FindCitizenByRegNo(regNo string) (*models.Citizen, error) {
	return nil, nil
}

func (m *MockUserRepository) LogDanVerification(userID int64, regNo string, method string) error {
	return nil
}

func (m *MockUserRepository) GetDanVerificationLogs(userID int64) ([]models.DanVerificationLog, error) {
	return nil, nil
}

// AddUser adds a test user to the mock
func (m *MockUserRepository) AddUser(user *models.User) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.users[user.GenID] = user
}

// MockAuditRepository is a mock implementation of AuditRepository for testing
type MockAuditRepository struct {
	mu   sync.Mutex
	Logs []MockAuditLog
}

type MockAuditLog struct {
	UserID int64
	Action string
}

func NewMockAuditRepository() *MockAuditRepository {
	return &MockAuditRepository{}
}

func (m *MockAuditRepository) AddLog(userID int64, action string, details map[string]interface{}, ip string, userAgent string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Logs = append(m.Logs, MockAuditLog{UserID: userID, Action: action})
	return nil
}

func (m *MockAuditRepository) GetStats() (*struct {
	TotalClients  int
	ActiveClients int
	TotalUsers    int
	VerifiedUsers int
	Logins24h     int
}, error) {
	return nil, fmt.Errorf("not implemented in mock")
}

func (m *MockAuditRepository) GetRecentLogs(limit int) ([]struct {
	ID        int64
	UserID    int64
	UserEmail string
	Action    string
	Details   string
	IPAddress string
	CreatedAt string
}, error) {
	return nil, fmt.Errorf("not implemented in mock")
}
