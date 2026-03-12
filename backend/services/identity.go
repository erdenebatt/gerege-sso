package services

// IdentityResolver is the contract for any identity provider (Gerege Core, EID, etc.)
// that can resolve a person's identity from a search query (reg_no, email, phone, etc.)
//
// Implementations:
//   - GeregeCoreResolver: Legacy resolver using Gerege Core API
//   - EIDResolver:        (future) Resolves identity via EID card registry
//   - ChainedResolver:    Tries multiple resolvers in priority order
type IdentityResolver interface {
	// ResolveIdentity searches for a citizen by any identifier (reg_no, email, phone).
	// Returns nil, nil if not found (not an error).
	ResolveIdentity(searchText string) (*ResolvedIdentity, error)

	// Name returns the resolver name for logging/debugging.
	Name() string
}

// ResolvedIdentity is the provider-agnostic representation of a citizen's identity.
// All identity providers must map their response to this unified structure.
type ResolvedIdentity struct {
	// Core identity
	ExternalID int64  // Provider-specific ID (e.g., Gerege Core ID)
	CivilID    int64  // Civil registry ID
	RegNo      string // Registration number (e.g., АБ12345678)
	FamilyName string
	LastName   string
	FirstName  string
	Gender     int    // 1=male, 2=female
	BirthDate  string // YYYY-MM-DD

	// Contact
	Email   string
	PhoneNo string

	// Nationality & origin
	Nationality string
	AimagName   string
	SumName     string

	// Registered address
	ParentAddressID   int64
	ParentAddressName string
	AimagID           int64
	AimagCode         string
	SumID             int64
	SumCode           string
	BagID             int64
	BagCode           string
	BagName           string
	AddressDetail     string

	// Residential address
	ResidentialParentAddressID   int64
	ResidentialParentAddressName string
	ResidentialAimagID           int64
	ResidentialAimagCode         string
	ResidentialAimagName         string
	ResidentialSumID             int64
	ResidentialSumCode           string
	ResidentialSumName           string
	ResidentialBagID             int64
	ResidentialBagCode           string
	ResidentialBagName           string
	ResidentialAddressDetail     string

	// Tax
	EbarimtTIN string

	// Source metadata
	Source string // Which resolver provided this data (e.g., "gerege_core", "eid")
}

// ChainedResolver tries multiple IdentityResolvers in priority order.
// First successful non-nil result wins.
type ChainedResolver struct {
	resolvers []IdentityResolver
}

// NewChainedResolver creates a ChainedResolver from a list of resolvers (priority order).
func NewChainedResolver(resolvers ...IdentityResolver) *ChainedResolver {
	// Filter out nil resolvers
	active := make([]IdentityResolver, 0, len(resolvers))
	for _, r := range resolvers {
		if r != nil {
			active = append(active, r)
		}
	}
	return &ChainedResolver{resolvers: active}
}

func (c *ChainedResolver) ResolveIdentity(searchText string) (*ResolvedIdentity, error) {
	for _, r := range c.resolvers {
		identity, err := r.ResolveIdentity(searchText)
		if err != nil {
			// Log but continue to next resolver
			continue
		}
		if identity != nil {
			return identity, nil
		}
	}
	return nil, nil
}

func (c *ChainedResolver) Name() string {
	return "chained"
}

// HasResolvers returns true if at least one resolver is configured.
func (c *ChainedResolver) HasResolvers() bool {
	return len(c.resolvers) > 0
}

// GeregeCoreResolver adapts GeregeCoreService to the IdentityResolver interface.
type GeregeCoreResolver struct {
	core *GeregeCoreService
}

// NewGeregeCoreResolver wraps a GeregeCoreService as an IdentityResolver.
func NewGeregeCoreResolver(core *GeregeCoreService) IdentityResolver {
	if core == nil {
		return nil
	}
	return &GeregeCoreResolver{core: core}
}

func (r *GeregeCoreResolver) ResolveIdentity(searchText string) (*ResolvedIdentity, error) {
	resp, err := r.core.FindCitizen(searchText)
	if err != nil {
		return nil, err
	}
	if resp == nil {
		return nil, nil
	}

	return &ResolvedIdentity{
		ExternalID: resp.ID,
		CivilID:    resp.CivilID,
		RegNo:      resp.RegNo,
		FamilyName: resp.FamilyName,
		LastName:   resp.LastName,
		FirstName:  resp.FirstName,
		Gender:     resp.Gender,
		BirthDate:  resp.BirthDate,
		Email:      resp.Email,
		PhoneNo:    resp.PhoneNo,
		Nationality: resp.Nationality,
		AimagName:   resp.AimagName,
		SumName:     resp.SumName,

		ParentAddressID:   resp.ParentAddressID,
		ParentAddressName: resp.ParentAddressName,
		AimagID:           resp.AimagID,
		AimagCode:         resp.AimagCode,
		SumID:             resp.SumID,
		SumCode:           resp.SumCode,
		BagID:             resp.BagID,
		BagCode:           resp.BagCode,
		BagName:           resp.BagName,
		AddressDetail:     resp.AddressDetail,

		ResidentialParentAddressID:   resp.ResidentialParentAddressID,
		ResidentialParentAddressName: resp.ResidentialParentAddressName,
		ResidentialAimagID:           resp.ResidentialAimagID,
		ResidentialAimagCode:         resp.ResidentialAimagCode,
		ResidentialAimagName:         resp.ResidentialAimagName,
		ResidentialSumID:             resp.ResidentialSumID,
		ResidentialSumCode:           resp.ResidentialSumCode,
		ResidentialSumName:           resp.ResidentialSumName,
		ResidentialBagID:             resp.ResidentialBagID,
		ResidentialBagCode:           resp.ResidentialBagCode,
		ResidentialBagName:           resp.ResidentialBagName,
		ResidentialAddressDetail:     resp.ResidentialAddressDetail,

		EbarimtTIN: resp.EbarimtTIN,
		Source:     "gerege_core",
	}, nil
}

func (r *GeregeCoreResolver) Name() string {
	return "gerege_core"
}
