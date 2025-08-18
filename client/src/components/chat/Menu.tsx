import { useState, useCallback, useEffect } from "react";
import { Radio, Typography, Button } from "antd";
import type { RadioChangeEvent } from "antd";
import { useChatActions } from "@/core";

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
  const { updateMessage } = useChatActions();

  const [selectedOption, setSelectedOption] = useState<MenuOption | null>(null);
  const [isSumbit, setIsSubmit] = useState<boolean>(prev === true);

  let menuContent: string = "";
  let menuFlag:
    | {
        __type: string;
        id: string;
        selected: string;
      }
    | undefined = undefined;

  const options: MenuOption[] = [];

  menuList.forEach((item, index) => {
    try {
      if (index === 0) {
        const parsed = JSON.parse(item);
        if (parsed?.__type === "MENU-FLAG") {
          menuFlag = parsed;
          return;
        }
      }
    } catch {
      // JSON이 아니면 계속 진행
    }

    if (item === "[Options]") {
      menuContent = "진행을 선택해주세요.";
      return;
    }
    if (index === 1) {
      menuContent = item;
      return;
    }

    if (index === 2 && !menuContent) {
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

  const handleSubmit = useCallback(() => {
    if (onOptionSelect && selectedOption) {
      if (menuFlag) {
        updateMessage(menuFlag.id, {
          componentData: [
            JSON.stringify({ ...menuFlag, selected: selectedOption.value }),
            ...menuList.slice(1),
          ],
        });
      }
      onOptionSelect(selectedOption);
      setIsSubmit(true);
    }
  }, [menuFlag]);

  useEffect(() => {
    if (options.length > 0 && !selectedOption) {
      if (menuFlag && menuFlag.selected !== "") {
        const _selected = menuFlag.selected;
        const findOption = options.find((_find) => _find.value === _selected);

        if (findOption) {
          setIsSubmit(true);
          setSelectedOption(findOption);
          return;
        }
      }
      setIsSubmit(false);
      setSelectedOption(options[0]);
    }
  }, [options.length, menuFlag]);

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
            disabled={isSumbit}
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
