-- Скрипт для исправления NULL значений в chat_messages
-- Удаляем записи с NULL chat_id (если они есть)
DELETE FROM chat_messages WHERE chat_id IS NULL;

-- Убеждаемся, что колонка NOT NULL
ALTER TABLE chat_messages ALTER COLUMN chat_id SET NOT NULL;

