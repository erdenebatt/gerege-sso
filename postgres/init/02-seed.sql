-- Gerege SSO Seed Data
-- =====================
-- Citizens data imported from provided dataset

INSERT INTO citizens (civil_id, reg_no, family_name, last_name, first_name, birth_date, sex, nationality, current_province, current_district, phone_primary, email) VALUES
('MN1990010100001', 'УБ90010199', 'Борджигин', 'Батбаяр', 'Ганболд', '1990-01-01', 'M', 'Mongolian', 'Улаанбаатар', 'Баянзүрх', '99001122', 'ganaa@example.mn'),
('MN1985050500002', 'УА85050288', 'Хиад', 'Дорж', 'Оюунчимэг', '1985-05-02', 'F', 'Mongolian', 'Улаанбаатар', 'Сүхбаатар', '99112233', 'oyunaa@example.mn'),
('MN1978122000003', 'ДО78120377', NULL, 'Цэрэн', 'Болд', '1978-12-03', 'M', 'Mongolian', 'Дорнод', 'Хэрлэн', '99223344', 'bold@example.mn'),
('MN2000080800004', 'УБ00080866', 'Боржигон', 'Мөнх', 'Сарнай', '2000-08-08', 'F', 'Mongolian', 'Улаанбаатар', 'Хан-Уул', '99334455', 'sarnai@example.mn'),
('MN1995030300005', 'АР95030355', NULL, 'Баатар', 'Тэмүүлэн', '1995-03-03', 'M', 'Mongolian', 'Архангай', 'Эрдэнэбулган', '99445566', 'temuulen@example.mn')
ON CONFLICT (reg_no) DO NOTHING;

-- Note: For bulk import, use scripts/import-citizens.py with CSV/JSON file
