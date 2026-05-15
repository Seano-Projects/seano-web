package util

import (
	"fmt"
	"os"
	"strconv"

	"gopkg.in/gomail.v2"
)

type EmailService struct {
	dialer *gomail.Dialer
	from   string
}

func NewEmailService() *EmailService {
	host := os.Getenv("SMTP_HOST")
	portStr := os.Getenv("SMTP_PORT")
	username := os.Getenv("SMTP_USERNAME")
	password := os.Getenv("SMTP_PASSWORD")
	from := os.Getenv("SMTP_FROM")

	// Default values for Gmail
	if host == "" {
		host = "smtp.gmail.com"
	}
	if portStr == "" {
		portStr = "587"
	}
	if from == "" {
		from = username
	}

	port, _ := strconv.Atoi(portStr)

	return &EmailService{
		dialer: gomail.NewDialer(host, port, username, password),
		from:   from,
	}
}

func (s *EmailService) SendVerificationEmail(toEmail, token string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", s.from)
	m.SetHeader("To", toEmail)
	m.SetHeader("Subject", "Verify Your Email - SeaPortal")

	// Get frontend URL from env or use default
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "https://seano.cloud"
	}
	
	verificationLink := fmt.Sprintf("%s/auth/set-account?token=%s", frontendURL, token)

	// Clean & Professional Email Template - Brand Focused
	body := fmt.Sprintf(`
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
		</head>
		<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
			<table width="100%%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
				<tr>
					<td align="center">
						<table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
							<!-- Header with Logo -->
							<tr>
								<td style="background-color:rgb(0, 0, 0); padding: 32px 40px; text-align: center;">
									<img src="https://seano.cloud/logo_seano.webp" alt="Seano Logo" style="width: 64px; height: 64px; margin-bottom: 12px;" />
									<h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">SeaPortal</h1>
									<p style="margin: 8px 0 0 0; color: #dbeafe; font-size: 14px;">Unmanned Surface Vehicle Monitoring</p>
								</td>
							</tr>
							
							<!-- Content -->
							<tr>
								<td style="padding: 40px;">
									<h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 600;">Welcome!</h2>
									<p style="margin: 0 0 16px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
										Thank you for registering with SeaPortal. We're excited to have you on board!
										To complete your registration and set up your account credentials, please click the button below:
									</p>
									
									<!-- CTA Button -->
									<table width="100%%" cellpadding="0" cellspacing="0">
										<tr>
											<td align="center" style="padding: 0 0 32px 0;">
												<a href="%s" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 500;">
													Verify Email &amp; Set Credentials
												</a>
											</td>
										</tr>
									</table>
								</td>
							</tr>
							
							<!-- Footer -->
							<tr>
								<td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
									<p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
										If you didn't create an account with Seano, please ignore this email or contact our support team if you have concerns.
									</p>
									<p style="margin: 0; color: #9ca3af; font-size: 12px;">
										&copy; 2025 SeaPortal. All rights reserved.
									</p>
								</td>
							</tr>
						</table>
						
						<p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
										This is an automated email. Please do not reply to this message.
									</p>
					</td>
				</tr>
			</table>
		</body>
		</html>
	`, verificationLink)

	m.SetBody("text/html", body)

	// Send email
	if err := s.dialer.DialAndSend(m); err != nil {
		return fmt.Errorf("failed to send email: %v", err)
	}

	return nil
}

func (s *EmailService) SendPasswordResetEmail(toEmail, token string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", s.from)
	m.SetHeader("To", toEmail)
	m.SetHeader("Subject", "Password Reset Request")

	body := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; padding: 20px;">
			<div style="max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 10px;">
				<h2 style="color: #333;">Password Reset</h2>
				<p>You requested to reset your password. Use the token below:</p>
				<div style="background-color: #fff; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #2196F3;">
					<strong style="font-size: 18px; color: #2196F3;">%s</strong>
				</div>
				<p>This token will expire in 24 hours.</p>
				<p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
			</div>
		</body>
		</html>
	`, token)

	m.SetBody("text/html", body)

	if err := s.dialer.DialAndSend(m); err != nil {
		return fmt.Errorf("failed to send email: %v", err)
	}

	return nil
}

func (s *EmailService) SendPasswordResetLink(toEmail, resetLink string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", s.from)
	m.SetHeader("To", toEmail)
	m.SetHeader("Subject", "Password Reset - SeaPortal")

	body := fmt.Sprintf(`
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
		</head>
		<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
			<table width="100%%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
				<tr>
					<td align="center">
						<table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
							<tr>
								<td style="background-color:rgb(0, 0, 0); padding: 32px 40px; text-align: center;">
									<img src="https://seano.cloud/logo_seano.webp" alt="Seano Logo" style="width: 64px; height: 64px; margin-bottom: 12px;" />
									<h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">SeaPortal</h1>
								</td>
							</tr>
							<tr>
								<td style="padding: 40px;">
									<h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 600;">Password Reset Request</h2>
									<p style="margin: 0 0 16px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
										We received a request to reset your password. Click the button below to set a new password:
									</p>
									<table width="100%%" cellpadding="0" cellspacing="0">
										<tr>
											<td align="center" style="padding: 8px 0 32px 0;">
												<a href="%s" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 500;">
													Reset Password
												</a>
											</td>
										</tr>
									</table>
									<p style="margin: 0; color: #6b7280; font-size: 13px;">This link will expire in 24 hours.</p>
								</td>
							</tr>
							<tr>
								<td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
									<p style="margin: 0; color: #6b7280; font-size: 13px;">If you didn't request this, please ignore this email.</p>
									<p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">&copy; 2025 SeaPortal. All rights reserved.</p>
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
		</body>
		</html>
	`, resetLink)

	m.SetBody("text/html", body)

	if err := s.dialer.DialAndSend(m); err != nil {
		return fmt.Errorf("failed to send email: %v", err)
	}

	return nil
}
