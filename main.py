from src.workflow import Workflow

if __name__ == "__main__":
    # try:
    workflow = Workflow()
    still_running = True
    
    while still_running:
        url = input("Enter a youtube URL: ")
        mode = int(input("Select your mode \n 0:Summary \n 1:Outline \n 2:Explain like I'm 12 \n"))
        result = workflow.run(url,mode)
        print("result:",result)
        continue_chat = input("Do you want to continue?(Y/N) ").lower()
        if continue_chat == "y":
            continue
        elif continue_chat == "n":
            still_running = False
        else:
            print("Invalid input. Exiting by default.")
            still_running = False
    # except Exception as e:
    #     print(e)
    #     still_running = False
            