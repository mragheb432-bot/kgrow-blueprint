KG_CODE("f:install-autoskill.sh","#!/bin/sh\nset -eu\nROOT=$(CDPATH= cd -- \"$(dirname -- \"$0\")\" && pwd)\nexec python3 -I \"$ROOT/scripts/install_autoskill.py\" \"$@\"\n");
