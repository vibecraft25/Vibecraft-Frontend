import random
import time

def main():
    print("PMC Client 시작됨")
    
    while True:
        try:
            user_input = input("프롬프트를 입력하세요: ")
            
            if user_input.lower() == 'quit':
                print("PMC Client 종료")
                break
            
            random_number = random.randint(1, 100)
            print(f"응답: {random_number}")
            
        except KeyboardInterrupt:
            print("\nPMC Client 종료")
            break
        except Exception as e:
            print(f"오류 발생: {e}")

if __name__ == "__main__":
    main()