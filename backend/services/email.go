package services

import (
	"fmt"
	"net/smtp"

	"gerege-sso/config"
)

// EmailService handles sending emails via SMTP
type EmailService struct {
	host     string
	port     string
	user     string
	password string
	from     string
}

// NewEmailService creates a new EmailService. Returns nil if SMTP is not configured.
func NewEmailService(cfg config.SMTPConfig) *EmailService {
	if cfg.Host == "" || cfg.User == "" {
		return nil
	}
	return &EmailService{
		host:     cfg.Host,
		port:     cfg.Port,
		user:     cfg.User,
		password: cfg.Password,
		from:     cfg.From,
	}
}

// SendOTP sends a 6-digit OTP code to the given email address
func (s *EmailService) SendOTP(to, otp string) error {
	subject := "Gerege SSO - Нэвтрэх код"
	body := fmt.Sprintf(`Сайн байна уу,

Таны нэвтрэх код: %s

Код 10 минутын дотор хүчинтэй.

Хэрэв та энэ кодыг хүсээгүй бол энэ имэйлийг үл тоомсорлоно уу.

---
Gerege SSO
sso.gerege.mn`, otp)

	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n%s",
		s.from, to, subject, body)

	auth := smtp.PlainAuth("", s.user, s.password, s.host)
	addr := s.host + ":" + s.port

	return smtp.SendMail(addr, auth, s.from, []string{to}, []byte(msg))
}
