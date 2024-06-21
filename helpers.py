## static objects

class bcolors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

ddl_function_tenses = {
    "build": {
        "present": "building",
        "past": "built"
    },
    "drop": {
        "present": "dropping",
        "past": "dropped"
    }
}

accepted_processes = ["build", "drop"]

state = "build"

if __name__ == "__main__":
    print(ddl_function_tenses)
    print(ddl_function_tenses[state])
    print(ddl_function_tenses[state]["present"])
    exit()