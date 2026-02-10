package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// CoreCitizenResponse represents the response from Gerege Core API /api/user/find
type CoreCitizenResponse struct {
	ID        int64  `json:"id"`
	CivilID   int64  `json:"civil_id"`
	RegNo     string `json:"reg_no"`
	FamilyName string `json:"family_name"`
	LastName   string `json:"last_name"`
	FirstName  string `json:"first_name"`
	Gender     int    `json:"gender"`
	BirthDate  string `json:"birth_date"`
	IsForeign  int    `json:"is_foreign"`
	Hash       string `json:"hash"`
	Email      string `json:"email"`
	PhoneNo    string `json:"phone_no"`

	ParentAddressID   int64  `json:"parent_address_id"`
	ParentAddressName string `json:"parent_address_name"`
	AimagID           int64  `json:"aimag_id"`
	AimagCode         string `json:"aimag_code"`
	AimagName         string `json:"aimag_name"`
	SumID             int64  `json:"sum_id"`
	SumCode           string `json:"sum_code"`
	SumName           string `json:"sum_name"`
	BagID             int64  `json:"bag_id"`
	BagCode           string `json:"bag_code"`
	BagName           string `json:"bag_name"`
	AddressDetail     string `json:"address_detail"`
	AddressType       string `json:"address_type"`
	AddressTypeName   string `json:"address_type_name"`

	Nationality    string `json:"nationality"`
	CountryCode    string `json:"country_code"`
	CountryName    string `json:"country_name"`
	CountryNameEn  string `json:"country_name_en"`
	ProfileImgURL  string `json:"profile_img_url"`

	ResidentialParentAddressID   int64  `json:"residential_parent_address_id"`
	ResidentialParentAddressName string `json:"residential_parent_address_name"`
	ResidentialAimagID           int64  `json:"residential_aimag_id"`
	ResidentialAimagCode         string `json:"residential_aimag_code"`
	ResidentialAimagName         string `json:"residential_aimag_name"`
	ResidentialSumID             int64  `json:"residential_sum_id"`
	ResidentialSumCode           string `json:"residential_sum_code"`
	ResidentialSumName           string `json:"residential_sum_name"`
	ResidentialBagID             int64  `json:"residential_bag_id"`
	ResidentialBagCode           string `json:"residential_bag_code"`
	ResidentialBagName           string `json:"residential_bag_name"`
	ResidentialAddressDetail     string `json:"residential_address_detail"`

	EbarimtTIN string `json:"ebarimt_tin"`
}

// GeregeCoreService handles communication with the Gerege Core API
type GeregeCoreService struct {
	baseURL string
	token   string
	client  *http.Client
}

// NewGeregeCoreService creates a new GeregeCoreService
func NewGeregeCoreService(baseURL, token string) *GeregeCoreService {
	return &GeregeCoreService{
		baseURL: baseURL,
		token:   token,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// FindCitizen searches for a citizen by registration number via Gerege Core API
func (s *GeregeCoreService) FindCitizen(searchText string) (*CoreCitizenResponse, error) {
	reqBody, err := json.Marshal(map[string]string{
		"search_text": searchText,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", s.baseURL+"/api/user/find", bytes.NewReader(reqBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.token)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("core API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("core API returned status %d", resp.StatusCode)
	}

	var citizen CoreCitizenResponse
	if err := json.NewDecoder(resp.Body).Decode(&citizen); err != nil {
		return nil, fmt.Errorf("failed to decode core API response: %w", err)
	}

	return &citizen, nil
}
