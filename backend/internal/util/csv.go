package util

// Contains checks if a string ends with a substring
func Contains(s, substr string) bool {
	return len(s) >= len(substr) && s[len(s)-len(substr):] == substr
}

// SplitLines splits CSV content into lines, respecting quoted fields
func SplitLines(s string) []string {
	var lines []string
	var current string
	inQuotes := false
	
	for i := 0; i < len(s); i++ {
		if s[i] == '"' {
			inQuotes = !inQuotes
		} else if s[i] == '\n' && !inQuotes {
			lines = append(lines, current)
			current = ""
			continue
		}
		current += string(s[i])
	}
	
	if current != "" {
		lines = append(lines, current)
	}
	
	return lines
}

// ParseCSVLine parses a single CSV line into fields, respecting quoted fields
func ParseCSVLine(line string) []string {
	var fields []string
	var current string
	inQuotes := false
	
	for i := 0; i < len(line); i++ {
		if line[i] == '"' {
			inQuotes = !inQuotes
		} else if line[i] == ',' && !inQuotes {
			fields = append(fields, current)
			current = ""
			continue
		} else {
			current += string(line[i])
		}
	}
	
	fields = append(fields, current)
	return fields
}
