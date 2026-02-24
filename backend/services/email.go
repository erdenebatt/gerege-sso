package services

import (
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"net"
	"net/smtp"
	"strings"
	"time"

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

	return s.sendMail(to, []byte(msg))
}

// sendMail connects to the SMTP server and sends the email.
// It tries STARTTLS if available, and authenticates if credentials are provided.
// Falls back to plain connection if STARTTLS is not supported (e.g., port 25).
func (s *EmailService) sendMail(to string, msg []byte) error {
	addr := s.host + ":" + s.port

	conn, err := net.DialTimeout("tcp", addr, 30*time.Second)
	if err != nil {
		return fmt.Errorf("dial: %w", err)
	}

	c, err := smtp.NewClient(conn, s.host)
	if err != nil {
		conn.Close()
		return fmt.Errorf("smtp client: %w", err)
	}
	defer c.Close()

	if err := c.Hello("sso.gerege.mn"); err != nil {
		return fmt.Errorf("hello: %w", err)
	}

	// Try STARTTLS if supported
	if ok, _ := c.Extension("STARTTLS"); ok {
		tlsConfig := &tls.Config{ServerName: s.host}
		if err := c.StartTLS(tlsConfig); err != nil {
			return fmt.Errorf("starttls: %w", err)
		}
	}

	// Authenticate if credentials are provided and AUTH is supported
	if s.user != "" && s.password != "" {
		if ok, _ := c.Extension("AUTH"); ok {
			auth := smtp.PlainAuth("", s.user, s.password, s.host)
			if err := c.Auth(auth); err != nil {
				// If PlainAuth fails, try LOGIN auth
				auth := LoginAuth(s.user, s.password)
				if err := c.Auth(auth); err != nil {
					return fmt.Errorf("auth: %w", err)
				}
			}
		}
	}

	if err := c.Mail(s.from); err != nil {
		return fmt.Errorf("mail from: %w", err)
	}
	if err := c.Rcpt(to); err != nil {
		return fmt.Errorf("rcpt to: %w", err)
	}

	w, err := c.Data()
	if err != nil {
		return fmt.Errorf("data: %w", err)
	}
	if _, err := w.Write(msg); err != nil {
		return fmt.Errorf("write: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("close data: %w", err)
	}

	return c.Quit()
}

// loginAuth implements smtp.Auth for LOGIN mechanism
type loginAuth struct {
	username, password string
}

// LoginAuth returns an Auth that implements the LOGIN authentication mechanism.
func LoginAuth(username, password string) smtp.Auth {
	return &loginAuth{username, password}
}

func (a *loginAuth) Start(server *smtp.ServerInfo) (string, []byte, error) {
	return "LOGIN", nil, nil
}

func (a *loginAuth) Next(fromServer []byte, more bool) ([]byte, error) {
	if more {
		switch strings.ToLower(string(fromServer)) {
		case "username:":
			return []byte(a.username), nil
		case "password:":
			return []byte(a.password), nil
		default:
			return nil, fmt.Errorf("unexpected server challenge: %s", fromServer)
		}
	}
	return nil, nil
}
