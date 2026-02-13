package services

import (
	"encoding/base64"
	"fmt"
	"net/smtp"
	"strings"

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

// encodeSubject encodes a UTF-8 subject using RFC 2047 base64 encoding
func encodeSubject(s string) string {
	return "=?UTF-8?B?" + base64.StdEncoding.EncodeToString([]byte(s)) + "?="
}

// SendOTP sends a 6-digit OTP code to the given email address
func (s *EmailService) SendOTP(to, otp string) error {
	subject := encodeSubject("Gerege SSO - Нэвтрэх код")
	body := fmt.Sprintf("Сайн байна уу,\r\n\r\nТаны нэвтрэх код: %s\r\n\r\nКод 10 минутын дотор хүчинтэй.\r\n\r\nХэрэв та энэ кодыг хүсээгүй бол энэ имэйлийг үл тоомсорлоно уу.\r\n\r\n---\r\nGerege SSO\r\nsso.gerege.mn", otp)
	encodedBody := base64.StdEncoding.EncodeToString([]byte(body))

	// Wrap base64 at 76 chars per RFC 2045
	var wrapped []string
	for i := 0; i < len(encodedBody); i += 76 {
		end := i + 76
		if end > len(encodedBody) {
			end = len(encodedBody)
		}
		wrapped = append(wrapped, encodedBody[i:end])
	}

	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n%s\r\n",
		s.from, to, subject, strings.Join(wrapped, "\r\n"))

	auth := smtp.PlainAuth("", s.user, s.password, s.host)
	addr := s.host + ":" + s.port

	return smtp.SendMail(addr, auth, s.from, []string{to}, []byte(msg))
}
