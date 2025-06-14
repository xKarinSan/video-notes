from src.workflow import Workflow

if __name__ == "__main__":
    workflow = Workflow()
    still_running = True
    
    while still_running:
        url = input("Enter a youtube URL: ")
        result = workflow.run(url)
        print("result:",result)
        continue_chat = input("Do you want to continue?(Y/N) ").lower()
        if continue_chat == "y":
            continue
        elif continue_chat == "n":
            still_running = False
        else:
            print("Invalid input. Exiting by default.")
            still_running = False
            