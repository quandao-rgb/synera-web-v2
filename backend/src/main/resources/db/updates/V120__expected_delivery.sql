ALTER TABLE sales_order ADD COLUMN expected_delivery DATE NULL;
UPDATE system_param SET param_value='0' WHERE param_key='receipt-auto-enabled';
