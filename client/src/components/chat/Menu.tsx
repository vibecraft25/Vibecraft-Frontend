import { useState, useEffect } from "react";
import { Radio, Typography, Button } from "antd";
import type { RadioChangeEvent } from "antd";

const { Text } = Typography;

export interface MenuOption {
  value: string;
  label: string;
}

export interface MenuProps {
  className?: string;
  menuList: string[];
  prev?: boolean;
  onOptionSelect?: (selectedOption: MenuOption) => void;
}

const Menu = ({ menuList, onOptionSelect, prev, className }: MenuProps) => {
  const [selectedOption, setSelectedOption] = useState<MenuOption | null>(null);
  // TODO : 호출 된 값이 있으면 isSubmit으로 버튼 비활성화
  const [isSumbit, setIsSubmit] = useState<boolean>(prev === true);

  let menuContent: string = "";
  const options: MenuOption[] = [];

  menuList.forEach((item, index) => {
    if (item === "[Options]") {
      menuContent = "진행을 선택해주세요.";
      return;
    }
    if (index === 0) {
      menuContent = item;
      return;
    }

    if (index === 1 && !menuContent) {
      menuContent = item;
      return;
    }

    const optionMatch = item.match(/^(\d+)\.\s*(.+)$/);
    if (optionMatch) {
      options.push({
        value: optionMatch[1],
        label: optionMatch[2],
      });
    }
  });

  const handleRadioChange = (e: RadioChangeEvent) => {
    const selectedValue = e.target.value;
    // string value를 사용하여 해당하는 option 객체 찾기
    const foundOption = options.find(
      (option) => option.value === selectedValue
    );
    if (foundOption) {
      setSelectedOption(foundOption);
    }
  };

  const handleSubmit = () => {
    if (onOptionSelect && selectedOption) {
      onOptionSelect(selectedOption);
      setIsSubmit(true);
    }
  };

  useEffect(() => {
    if (options.length > 0 && !selectedOption) {
      setSelectedOption(options[0]);
    }
  }, [options.length]);

  return (
    <div className={`p-4 bg-transparent ${className || ""}`}>
      <div className="mb-3">
        <Text strong className="text-gray-800">
          {menuContent}
        </Text>
      </div>

      {options.length > 0 && (
        <div className="mb-4">
          <Radio.Group
            value={selectedOption?.value}
            onChange={handleRadioChange}
            className="w-full"
          >
            <div className="space-y-3">
              {options.map((option, index) => {
                return (
                  <Radio
                    key={`option-[${index}]${option.value}`}
                    value={option.value}
                    className="w-full"
                  >
                    <span className="ml-2 text-gray-800">{option.label}</span>
                  </Radio>
                );
              })}
            </div>
          </Radio.Group>
        </div>
      )}

      <div className="mt-4">
        <Button
          type="primary"
          onClick={handleSubmit}
          disabled={isSumbit}
          className="bg-blue-500 hover:bg-blue-600"
        >
          선택 완료
        </Button>
      </div>
    </div>
  );
};

export default Menu;
