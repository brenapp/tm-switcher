#!/usr/bin/env bash

main() {
    local version="$1"
    
    # set package.json at root
    if [ -f package.json ]; then
        npm version "$version" --no-git-tag-version
    else
        echo "package.json not found in the current directory."
        exit 1
    fi
    
    # set package.json in host
    
    if [ -f host/package.json ]; then
        npm --prefix host version "$version" --no-git-tag-version
    else
        echo "host/package.json not found in the current directory."
        exit 1
    fi

    git add package.json host/package.json
    if [ $? -ne 0 ]; then
        echo "Failed to add package.json files to git."
        exit 1
    fi
    
    git commit -m "$version"
    if [ $? -ne 0 ]; then
        echo "Failed to commit changes to package.json files."
        exit 1
    fi

    # Create a new version tag
    git tag -a "v$version" -m "Version $version"
    if [ $? -ne 0 ]; then
        echo "Failed to create a new version tag."
        exit 1
    fi

    echo "Version set to $version and tag v$version created."
}

main "$@"